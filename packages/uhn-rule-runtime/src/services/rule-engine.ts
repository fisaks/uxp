// services/rule-engine.ts
import type {
    BlueprintRule,
    ResourceState,
    RuleAction,
    RuleCause,
    RuntimeRuleAction,
    TriggerEvent,
    TriggerSpec,
} from "@uhn/blueprint";
import { assertNever } from "@uxp/common";
import { stdoutWriter } from "../io/stdout-writer";
import { RuntimeStateChange } from "../types/rule-runtime.type";
import type { RuntimeRulesService } from "./runtime-rules.service";
import type { RuntimeStateService } from "./runtime-state.service";

export function detectResourceEvents(
    prev: ResourceState | undefined,
    next: ResourceState
): TriggerEvent[] {
    const events: TriggerEvent[] = [];

    if (prev?.value !== next.value) {
        events.push("changed");
    }

    if (prev?.value === false && next.value === true) {
        events.push("activated");
    }

    if (prev?.value === true && next.value === false) {
        events.push("deactivated");
    }

    return events;
}

type RuleExecutionState = {
    lastRunAt?: number;
    debounceUntil?: number;
};



export class RuleEngine {
    private readonly ruleExecutionState = new Map<string, RuleExecutionState>();

    constructor(
        private readonly stateService: RuntimeStateService,
        private readonly rulesService: RuntimeRulesService
    ) {

        // Subscribe to state changes
        this.stateService.on("stateChanged", (change) => {
            setImmediate(() => {
                this.onStateChanged(change);
            });
        });

        this.stateService.on("stateReset", () => {
            setImmediate(() => {
                this.ruleExecutionState.clear();
            });
        });
    }

    private onStateChanged(change: RuntimeStateChange) {
        const { resourceId, prev, next } = change;

        const resourceEvents = detectResourceEvents(prev, next);
        if (!resourceEvents.length) return;

        const resourceRules = this.rulesService.getRulesForResource(resourceId);
        if (!resourceRules.length) return;

        const now = next.timestamp;

        for (const resourceRule of resourceRules) {
            for (const resourceTrigger of resourceRule.triggers) {
                if (!this.eventsMatchTrigger(resourceId, resourceEvents, resourceTrigger)) continue;

                const cause: RuleCause = {
                    resource: resourceTrigger.resource,
                    event: resourceTrigger.event,
                    timestamp: now,
                };

                const actions = this.executeRule(resourceRule, cause, now);
                if (actions.length) {
                    stdoutWriter.send({ kind: "event", cmd: "actions", actions });

                }
            }
        }
    }

    private eventsMatchTrigger(
        resourceId: string,
        events: TriggerEvent[],
        trigger: TriggerSpec,

    ): trigger is Extract<TriggerSpec, { type: "resource" }> {
        if (trigger.type !== "resource") return false;
        if (trigger.resource.id !== resourceId) return false;
        return events.includes(trigger.event);
    }

    private executeRule(
        rule: BlueprintRule,
        cause: RuleCause,
        now: number
    ): RuntimeRuleAction[] {
        const ruleState = this.ruleExecutionState.get(rule.id) ?? {};

        // Cooldown
        if (rule.cooldownMs && ruleState.lastRunAt) {
            if (now - ruleState.lastRunAt < rule.cooldownMs) {
                return [];
            }
        }

        // Debounce
        if (rule.debounceMs) {
            if (ruleState.debounceUntil && now < ruleState.debounceUntil) {
                return [];
            }
            ruleState.debounceUntil = now + rule.debounceMs;
        }

        let actions: RuleAction[] = [];
        try {
            actions = rule.run({
                now,
                cause,
                runtime: {
                    getState: (r) => r.id ? this.stateService.get(r.id) : undefined,
                },
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
                logger: {
                    info: (msg, data) =>
                        stdoutWriter.log({ level: "info", component: `rule:${rule.id}`, message: `${msg} data:${JSON.stringify(data)}`, }),
                    warn: (msg, data) =>
                        stdoutWriter.log({ level: "warn", component: `rule:${rule.id}`, message: `${msg} data:${JSON.stringify(data)}` }),
                    error: (msg, data) =>
                        stdoutWriter.log({ level: "error", component: `rule:${rule.id}`, message: `${msg} data:${JSON.stringify(data)}` }),
                },
            });
        } catch (error) {
            stdoutWriter.log({
                level: "error",
                component: `rule:${rule.id}`,
                message: `${error}`,
            });
            return [];
        }

        ruleState.lastRunAt = now;
        this.ruleExecutionState.set(rule.id, ruleState);

        return actions.map(this.toRuntimeAction).filter((a): a is RuntimeRuleAction => a !== undefined);
    }

    private toRuntimeAction(action: RuleAction): RuntimeRuleAction | undefined {
        if (!action.resource.id) {
            stdoutWriter.log({ level: "error", component: "RuleEngine", message: `Action resource is missing id: ${JSON.stringify(action)}` });
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
                assertNever(action);
        }
    }
}
