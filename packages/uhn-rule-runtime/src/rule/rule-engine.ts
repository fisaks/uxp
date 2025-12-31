// services/rule-engine.ts
import type {
    BlueprintRule,
    RuleAction,
    RuleCause,
    RuntimeReader,
    RuntimeRuleAction,
    TriggerEvent,
    RuleTrigger
} from "@uhn/blueprint";
import { ResourceError, ResourceStateNotAvailableError } from "@uhn/common";
import { assertNever } from "@uxp/common";
import { runtimeOutput } from "../io/runtime-output";
import type { RuntimeRulesService } from "../services/runtime-rules.service";
import type { RuntimeStateService } from "../services/runtime-state.service";
import { RuntimeStateChange } from "../types/rule-runtime.type";
import { createResourceErrorData } from "./rule-engine-error";
import { ruleLogger } from "./rule-engine-logging";
import { createRuleRuntime } from "./rule-engine-runtime";
import { RuleExecutionControl } from "./rule-engine.type";
import { getEventsFromStateChange } from "./rule-state-events";


export class RuleEngine {
    private readonly ruleExecutionControl = new Map<string, RuleExecutionControl>();
    private readonly ruleRuntime: RuntimeReader;
    constructor(
        private readonly stateService: RuntimeStateService,
        private readonly rulesService: RuntimeRulesService
    ) {
        this.ruleRuntime = createRuleRuntime({ stateService: this.stateService });
        // Subscribe to state changes
        this.stateService.on("stateChanged", (change) => {
            setImmediate(() => {
                this.handleResourceStateChange(change);
            });
        });

        this.stateService.on("stateReset", () => {
            setImmediate(() => {
                this.ruleExecutionControl.clear();
            });
        });
    }

    private handleResourceStateChange(change: RuntimeStateChange) {
        const { resourceId, prev, next } = change;

        const stateChangeEvents = getEventsFromStateChange(prev, next);
        if (!stateChangeEvents.length) return;

        const resourceRules = this.rulesService.getRulesForResource(resourceId);
        if (!resourceRules.length) return;

        const stateChangeTime = next.timestamp;

        for (const ruleCandidate of resourceRules) {
            for (const triggerCandidate of ruleCandidate.triggers) {
                if (!this.triggerFires(resourceId, triggerCandidate, stateChangeEvents)) continue;

                const triggerCause: RuleCause = {
                    resource: triggerCandidate.resource,
                    event: triggerCandidate.event,
                    timestamp: stateChangeTime,
                };

                const actions = this.tryRunRule(ruleCandidate, triggerCause, stateChangeTime);
                if (actions.length) {
                    runtimeOutput.send({ kind: "event", cmd: "actions", actions });

                }
            }
        }
    }

    private triggerFires(
        resourceId: string,
        trigger: RuleTrigger,
        events: TriggerEvent[]
    ): trigger is Extract<RuleTrigger, { kind: "resource" }> {
        if (trigger.kind !== "resource") return false;
        if (trigger.resource.id !== resourceId) return false;
        return events.includes(trigger.event);
    }

    private tryRunRule(
        ruleCandidate: BlueprintRule,
        runCause: RuleCause,
        stateChangeTime: number
    ): RuntimeRuleAction[] {
        const ruleControl = this.ruleExecutionControl.get(ruleCandidate.id) ?? {};
        const logger = ruleLogger(ruleCandidate.id);
        // Cooldown: block repeated executions.
        // After the rule runs, do not allow it to run again for X milliseconds.
        if (ruleCandidate.cooldownMs && ruleControl.lastRunAt) {
            if (stateChangeTime - ruleControl.lastRunAt < ruleCandidate.cooldownMs) {
                logger.info(`Skipped rule "${ruleCandidate.id}" due to cooldown.`);
                return [];
            }
        }

        // Suppress: ignore noisy triggers.
        // After a triggering event, ignore further triggers for X milliseconds.
        // The rule only runs in response to an event; no execution is scheduled
        // after the suppress period ends.
        // Suppression window is fixed from the first triggering event;
        // suppressed events do not extend the window.
        // Suppression is based on trigger arrival, not on whether the rule actually ran.
        if (ruleCandidate.suppressMs) {
            if (ruleControl.suppressUntil && stateChangeTime < ruleControl.suppressUntil) {
                logger.info(`Skipped rule "${ruleCandidate.id}" due to suppression.`);
                return [];
            }
            ruleControl.suppressUntil = stateChangeTime + ruleCandidate.suppressMs;
        }

        let actions: RuleAction[] = [];

        try {
            actions = ruleCandidate.run({
                cause: runCause,
                runtime: this.ruleRuntime,
                timers: {
                    start() {
                        throw new Error("Timers not implemented yet");
                    },
                    clear() {
                        throw new Error("Timers not implemented yet");
                    },
                    isRunning() {
                        return false;
                    },
                },
                logger,
            });
        } catch (error) {
            if (error instanceof ResourceStateNotAvailableError) {
                runtimeOutput.send({
                    kind: "event",
                    cmd: "resourceMissing",
                    ruleId: ruleCandidate.id,
                    resourceId: error.resourceId,
                    resourceType: error.resourceType,
                    reason: "stateUnavailable",
                });
                return [];
            }
            if (error instanceof ResourceError) {
                logger.error(error.message, createResourceErrorData(error));
                return [];
            }
            logger.error(String(error));
            return [];
        }

        ruleControl.lastRunAt = stateChangeTime;
        this.ruleExecutionControl.set(ruleCandidate.id, ruleControl);

        return actions.map(this.toRuntimeAction).filter((a): a is RuntimeRuleAction => a !== undefined);
    }

    private toRuntimeAction(action: RuleAction): RuntimeRuleAction | undefined {
        if (!action.resource.id) {
            runtimeOutput.log({ level: "error", component: "RuleEngine", message: `Action resource is missing id: ${JSON.stringify(action)}` });
            return undefined;
        }

        switch (action.type) {
            case "setOutput":
                return {
                    type: "setOutput",
                    resourceId: action.resource.id,
                    value: action.value,
                };
            case "emitSignal":
                return {
                    type: "emitSignal",
                    resourceId: action.resource.id,
                    value: action.value,
                };
            default:
                assertNever(action, "Unsupported RuleAction type in RuleEngine.toRuntimeAction");
        }
    }
}
