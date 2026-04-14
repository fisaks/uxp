// services/rule-engine.ts
import type {
    BlueprintRule,
    ResourceRuleCause,
    RuleAction,
    RuleCause,
    RuleTrigger,
    ScheduleRuleCause,
    StateReader,
    RuntimeRuleAction
} from "@uhn/blueprint";
import { ResourceError, ResourceStateNotAvailableError } from "@uhn/common";
import { runtimeOutput } from "../io/runtime-output";
import type { RuntimeRulesService } from "../services/runtime-rules.service";
import type { RuntimeStateService } from "../services/runtime-state.service";
import { RuntimeTimerService } from "../services/runtime-timer.service";
import { RuntimeMode } from "../types/rule-runtime.type";
import { createResourceErrorData } from "./rule-engine-error";
import { ruleLogger } from "./rule-engine-logging";
import { RuntimeMuteService } from "../services/runtime-mute.service";
import { RuntimeIntervalService } from "../services/runtime-interval.service";
import { createRuleMute } from "./rule-engine-mute";
import { createRuleStateReader } from "./rule-state-reader";
import { createRuleTimer } from "./rule-engine-timer";
import { RuleExecutionControl, RuleTriggerEvent, ScheduleTriggerEvent } from "./rule-engine.type";
import { isActionTrigger, isLongPressTrigger, isResourceTrigger, isScheduleTrigger, isTapTrigger, isThresholdTrigger, isTimerTrigger } from "./rule-engine.utils";
import { expandSceneActions, filterReachableActions, toRuntimeAction } from "./rule-action.utils";
import { TriggerEventBus } from "./trigger-event-bus";

/**
 * Hysteresis state for a single trigger instance.
 *
 * - "threshold" (onAbove/onBelow): `waitingFor` describes which direction
 *   the value must move next. When `waitingFor === trigger.direction`, the
 *   trigger is ready to fire on a threshold crossing. After firing, it flips
 *   to the opposite direction and waits for the value to pass the hysteresis
 *   re-arm point before flipping back. This prevents rapid re-firing when
 *   a value oscillates around the threshold.
 *
 * - "changed" (onChanged with hysteresis): `lastFiredValue` tracks the
 *   value at which the trigger last fired. Only fires again when the
 *   value has moved at least `hysteresis` units from that point.
 */
type HysteresisEntry =
    | { kind: "threshold"; waitingFor: "above" | "below" }
    | { kind: "changed"; lastFiredValue: number };

export class RuleEngine {
    private readonly ruleExecutionControl = new Map<string, RuleExecutionControl>();
    private readonly hysteresisState = new Map<string, HysteresisEntry>();
    private readonly stateReader: StateReader;
    private readonly mode: RuntimeMode;
    private readonly edgeName?: string;
    constructor(
        triggerEventBus: TriggerEventBus,
        private readonly rulesService: RuntimeRulesService,
        private readonly stateService: RuntimeStateService,
        private readonly timerService: RuntimeTimerService,
        private readonly muteService: RuntimeMuteService,
        private readonly intervalService: RuntimeIntervalService,
        mode: RuntimeMode,
        edgeName?: string,
    ) {
        this.mode = mode;
        this.edgeName = edgeName;
        this.stateReader = createRuleStateReader({ stateService: this.stateService });
        // Subscribe to state changes
        triggerEventBus.on((event) => {
            this.handleResourceTriggerEvent(event);
        });
    }

    /**
     * Handle a schedule-fired event. Looks up rules with onSchedule() triggers
     * matching the fired schedule and executes them through the shared tryRunRule path.
     */
    handleScheduleTriggerEvent(event: ScheduleTriggerEvent) {
        const scheduleId = event.schedule.id;
        if (!scheduleId) return;

        const rules = this.rulesService.getRulesForSchedule(scheduleId);
        if (!rules.length) {
            runtimeOutput.log({
                level: "debug",
                component: "RuleEngine",
                message: `No rules indexed for schedule "${scheduleId}"`,
            });
            return;
        }

        const cause: ScheduleRuleCause = {
            event: "schedule",
            timestamp: Date.now(),
            schedule: event.schedule,
        };

        for (const ruleCandidate of rules) {
            const actions = this.tryRunRule(ruleCandidate, cause, cause.timestamp);

            if (actions.length) {
                runtimeOutput.send({
                    kind: "event",
                    cmd: "actions",
                    actions,
                });
            } else {
                runtimeOutput.log({
                    level: "debug",
                    component: "RuleEngine",
                    message: `Rule "${ruleCandidate.id}" matched schedule "${scheduleId}" but produced 0 actions`,
                });
            }
        }
    }

    private handleResourceTriggerEvent(triggerEvent: RuleTriggerEvent) {
        const resourceId = triggerEvent.resource.id;
        if (!resourceId) return;

        if (this.muteService.isResourceMuted(resourceId)) {
            runtimeOutput.log({
                level: "info",
                component: "RuleEngine",
                message: `Skipping all rules for resource "${resourceId}" — resource is muted`,
            });
            return;
        }

        const rules = this.rulesService.getRulesForResource(resourceId);
        if (!rules.length) {
            runtimeOutput.log({
                level: "debug",
                component: "RuleEngine",
                message: `No rules indexed for resource "${resourceId}" (event: ${triggerEvent.event})`,
            });
            return;
        }

        for (const ruleCandidate of rules) {
            for (let triggerIdx = 0; triggerIdx < ruleCandidate.triggers.length; triggerIdx++) {
                const triggerCandidate = ruleCandidate.triggers[triggerIdx];
                if (!this.triggerMatches(triggerCandidate, triggerEvent, ruleCandidate.id, triggerIdx)) {
                    runtimeOutput.log({
                        level: "trace",
                        component: "RuleEngine",
                        message: `Trigger[${triggerIdx}] of rule "${ruleCandidate.id}" did not match event "${triggerEvent.event}" for resource "${resourceId}" (trigger kind: ${triggerCandidate.kind}, trigger resourceId: ${"resource" in triggerCandidate ? triggerCandidate.resource?.id : "N/A"})`,
                    });
                    continue;
                }

                const triggerCause: ResourceRuleCause = {
                    resource: triggerEvent.resource,
                    event: triggerEvent.event as ResourceRuleCause["event"],
                    timestamp: triggerEvent.timestamp,
                    thresholdMs: triggerEvent.thresholdMs,
                    action: triggerEvent.action,
                    metadata: triggerEvent.metadata,
                    depth: triggerEvent.depth,
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
                } else {
                    runtimeOutput.log({
                        level: "debug",
                        component: "RuleEngine",
                        message: `Rule "${ruleCandidate.id}" matched but produced 0 actions for resource "${resourceId}" (event: ${triggerEvent.event})`,
                    });
                }
            }
        }
    }

    private triggerMatches(
        trigger: RuleTrigger,
        event: RuleTriggerEvent,
        ruleId: string,
        triggerIdx: number
    ): boolean {
        // Schedule triggers are matched in handleScheduleTriggerEvent, not here
        if (isScheduleTrigger(trigger)) return false;

        if (trigger.resource.id !== event.resource.id) return false;

        if (isThresholdTrigger(trigger)) {
            return this.matchThresholdTrigger(trigger, event, ruleId, triggerIdx);
        }

        if (isResourceTrigger(trigger)) {
            if (trigger.event !== event.event) return false;
            // Handle onChanged with hysteresis for analog/complex resources
            const supportsHysteresis = trigger.resource.type === "analogInput" || trigger.resource.type === "analogOutput" || trigger.resource.type === "complex";
            if (trigger.event === "changed" && trigger.hysteresis !== undefined && supportsHysteresis && typeof event.value === "number") {
                return this.matchChangedWithHysteresis(trigger.hysteresis, event.value, ruleId, triggerIdx);
            }
            return true;
        }
        if (isLongPressTrigger(trigger) && event.event === "longPress") {
            return trigger.thresholdMs === event.thresholdMs;
        }
        if (isTapTrigger(trigger) && event.event === "tap") {
            return true;
        }
        if (isActionTrigger(trigger) && event.event === "action") {
            return trigger.action === event.action;
        }
        if (isTimerTrigger(trigger)) {
            return trigger.event === event.event;
        }

        return false;
    }

    /**
     * Threshold trigger state machine:
     *
     *   waitingFor === trigger.direction       waitingFor !== trigger.direction
     *   ┌──────────────┐  fires on crossing   ┌──────────────┐
     *   │ waitingFor:  │ ──────────────────→   │ waitingFor:  │
     *   │  "above"     │                       │  "below"     │
     *   └──────────────┘  ←────────────────    └──────────────┘
     *                      value passes re-arm point
     *
     * onAbove(threshold=25, hysteresis=2):
     *   waitingFor:"above" → fires when value crosses up past 25 → waitingFor:"below"
     *   waitingFor:"below" → flips back when value drops below 23 (25-2)
     *
     * onBelow(threshold=10, hysteresis=2):
     *   waitingFor:"below" → fires when value crosses down past 10 → waitingFor:"above"
     *   waitingFor:"above" → flips back when value rises above 12 (10+2)
     *
     * Without hysteresis (hysteresis=0), the re-arm point equals the
     * threshold, so the trigger re-arms as soon as the value moves
     * away from the threshold in the opposite direction.
     */
    private matchThresholdTrigger(
        trigger: Extract<RuleTrigger, { kind: "threshold" }>,
        event: RuleTriggerEvent,
        ruleId: string,
        triggerIdx: number
    ): boolean {
        if (event.event !== "changed") return false;
        if (typeof event.value !== "number") return false;

        const key = `${ruleId}:${triggerIdx}`;
        const entry = this.hysteresisState.get(key) as (HysteresisEntry & { kind: "threshold" }) | undefined;
        const waitingFor = entry?.waitingFor ?? trigger.direction;

        // On initial load, prevValue is undefined — treat as opposite extreme so
        // the threshold fires if the current value already satisfies the condition.
        const prev = typeof event.prevValue === "number" ? event.prevValue
            : (trigger.direction === "above" ? -Infinity : Infinity);
        const next = event.value;
        const hysteresis = trigger.hysteresis ?? 0;

        if (waitingFor === trigger.direction) {
            const crossed = trigger.direction === "above"
                ? prev < trigger.threshold && next >= trigger.threshold
                : prev > trigger.threshold && next <= trigger.threshold;

            if (crossed) {
                const oppositeWaitingFor = trigger.direction === "above" ? "below" : "above";
                this.hysteresisState.set(key, { kind: "threshold", waitingFor: oppositeWaitingFor });
                return true;
            }
        } else {
            // Check re-arm: value moved past hysteresis band in opposite direction
            const passedRetriggerPoint = trigger.direction === "above"
                ? next < trigger.threshold - hysteresis
                : next > trigger.threshold + hysteresis;

            if (passedRetriggerPoint) {
                this.hysteresisState.set(key, { kind: "threshold", waitingFor: trigger.direction });
            }
        }

        return false;
    }

    private matchChangedWithHysteresis(
        hysteresis: number,
        value: number,
        ruleId: string,
        triggerIdx: number
    ): boolean {
        const key = `${ruleId}:${triggerIdx}`;
        const entry = this.hysteresisState.get(key) as (HysteresisEntry & { kind: "changed" }) | undefined;

        if (!entry) {
            // First change always fires
            this.hysteresisState.set(key, { kind: "changed", lastFiredValue: value });
            return true;
        }

        if (Math.abs(value - entry.lastFiredValue) >= hysteresis) {
            this.hysteresisState.set(key, { kind: "changed", lastFiredValue: value });
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

        // Mute: skip rule if it has been muted (e.g. manual override)
        if (this.muteService.isRuleMuted(ruleCandidate.id)) {
            logger.info(`Skipped rule "${ruleCandidate.id}" — rule is muted`);
            return [];
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

        const ruleTimer = createRuleTimer({
            timerService: this.timerService,
            stateService: this.stateService,
            mode: this.mode,
            edgeName: this.edgeName,
        });

        const ruleMute = createRuleMute({ muteService: this.muteService });

        let actions: RuleAction[] = [];

        try {
            actions = ruleCandidate.run({
                cause: runCause,
                runtime: this.stateReader,
                timers: ruleTimer,
                mute: ruleMute,
                interval: this.intervalService,
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

        const reachableActions = filterReachableActions(
            expandSceneActions(actions),
            this.mode,
            this.edgeName,
            "RuleEngine",
        );

        const runtimeActions = reachableActions.map(action => {
            // Early loop prevention: drop emitAction targeting the same resource+action as the cause
            if (action.type === "emitAction" && runCause.event === "action"
                && runCause.resource.id === action.resource.id && runCause.action === action.action) {
                runtimeOutput.log({
                    level: "warn",
                    component: "RuleEngine",
                    message: `emitAction targets same resource+action as cause — dropping to prevent loop (resource: ${action.resource.id}, action: ${action.action})`,
                });
                return undefined;
            }
            const depth = action.type === "emitAction" ? (("depth" in runCause ? runCause.depth : 0) ?? 0) + 1 : 0;
            return toRuntimeAction(action, "RuleEngine", depth);
        }).filter((a): a is RuntimeRuleAction => a !== undefined);

        const timerActions = ruleTimer.drainPendingActions();
        const muteActions = ruleMute.drainPendingActions();
        return [...runtimeActions, ...timerActions, ...muteActions];
    }
}
