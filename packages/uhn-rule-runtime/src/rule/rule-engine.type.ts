import type { BlueprintSchedule, ResourceBase, ResourceType, TriggerEvent } from "@uhn/blueprint";
import type { ResourceStateValue } from "@uhn/common";

export type RuleExecutionControl = {
    lastRunAt?: number;
    suppressUntil?: number;
};

export type RuleTriggerEvent = {
    resource: ResourceBase<ResourceType>;
    event: TriggerEvent;
    timestamp: number;
    thresholdMs?: number;
    prevValue?: ResourceStateValue;
    value?: ResourceStateValue;
    action?: string;
    metadata?: unknown;
    /** Depth counter for loop prevention. 0 for physical/UI events, incremented for rule-emitted. */
    depth?: number;
};

/** Trigger event emitted when a schedule fires. Flows through a separate path in the rule engine.
 *  The schedule object is resolved from scheduleId by the command handler before reaching the engine. */
export type ScheduleTriggerEvent = {
    schedule: BlueprintSchedule;
    firedAt: string;
};

export type PushPressState = {
    pressedAt: number;
    firedThresholds: Set<number>;
    timers: Map<number, NodeJS.Timeout>;
};
