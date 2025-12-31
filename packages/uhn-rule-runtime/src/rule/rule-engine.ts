// services/rule-engine.ts
import type {
    BlueprintRule,
    RuleAction,
    RuleCause,
    RuleTrigger,
    RuntimeReader,
    RuntimeRuleAction
} from "@uhn/blueprint";
import { ResourceError, ResourceStateNotAvailableError } from "@uhn/common";
import { assertNever } from "@uxp/common";
import { runtimeOutput } from "../io/runtime-output";
import type { RuntimeRulesService } from "../services/runtime-rules.service";
import type { RuntimeStateService } from "../services/runtime-state.service";
import { createResourceErrorData } from "./rule-engine-error";
import { ruleLogger } from "./rule-engine-logging";
import { createRuleRuntime } from "./rule-engine-runtime";
import { RuleExecutionControl, RuleTriggerEvent } from "./rule-engine.type";
import { isLongPressTrigger, isResourceTrigger, isTapTrigger } from "./rule-engine.utils";
import { TriggerEventBus } from "./trigger-event-bus";


export class RuleEngine {
    private readonly ruleExecutionControl = new Map<string, RuleExecutionControl>();
    private readonly ruleRuntime: RuntimeReader;
    constructor(
        triggerEventBus: TriggerEventBus,
        private readonly rulesService: RuntimeRulesService,
        private readonly stateService: RuntimeStateService
    ) {
        this.ruleRuntime = createRuleRuntime({ stateService: this.stateService });
        // Subscribe to state changes
        triggerEventBus.on((event) => {
            this.handleTriggerEvent(event);
        });
    }

    private handleTriggerEvent(triggerEvent: RuleTriggerEvent) {
        const resourceId = triggerEvent.resource.id;
        if (!resourceId) return;

        const rules = this.rulesService.getRulesForResource(resourceId);
        if (!rules.length) return;

        for (const ruleCandidate of rules) {
            for (const triggerCandidate of ruleCandidate.triggers) {
                if (!this.triggerMatches(triggerCandidate, triggerEvent)) continue;

                const triggerCause: RuleCause = {
                    resource: triggerEvent.resource,
                    event: triggerEvent.event,
                    timestamp: triggerEvent.timestamp,
                    thresholdMs: triggerEvent.thresholdMs,
                };

                const actions = this.tryRunRule(
                    ruleCandidate,
                    triggerCause,
                    triggerEvent.timestamp
                );

                if (actions.length) {
                    runtimeOutput.send({
                        kind: "event",
                        cmd: "actions",
                        actions,
                    });
                }
            }
        }
    }

    private triggerMatches(
        trigger: RuleTrigger,
        event: RuleTriggerEvent
    ): boolean {
        if (trigger.resource.id !== event.resource.id) return false;
        if (isResourceTrigger(trigger)) {
            return trigger.event === event.event;
        }
        if (isLongPressTrigger(trigger) && event.event === "longPress") {
            return trigger.thresholdMs === event.thresholdMs;
        }
        if (isTapTrigger(trigger) && event.event === "tap") {
            return true;
        }

        return false;
    }

    private tryRunRule(
        ruleCandidate: BlueprintRule,
        runCause: RuleCause,
        eventTime: number
    ): RuntimeRuleAction[] {
        const ruleControl = this.ruleExecutionControl.get(ruleCandidate.id) ?? {};
        const logger = ruleLogger(ruleCandidate.id);
        // Cooldown: block repeated executions.
        // After the rule runs, do not allow it to run again for X milliseconds.
        if (ruleCandidate.cooldownMs && ruleControl.lastRunAt) {
            if (eventTime - ruleControl.lastRunAt < ruleCandidate.cooldownMs) {
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
            if (ruleControl.suppressUntil && eventTime < ruleControl.suppressUntil) {
                logger.info(`Skipped rule "${ruleCandidate.id}" due to suppression.`);
                return [];
            }
            ruleControl.suppressUntil = eventTime + ruleCandidate.suppressMs;
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

        ruleControl.lastRunAt = eventTime;
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
