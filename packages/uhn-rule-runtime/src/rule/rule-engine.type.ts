import type { BlueprintPhase, ResourceBase, ResourceType, TriggerEvent } from "@uhn/blueprint";
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

/** Trigger event emitted when a schedule phase fires.
 *  The phase object is resolved from phaseId by the command handler before reaching the engine. */
export type ScheduleTriggerEvent = {
    phase: BlueprintPhase;
    firedAt: string;
};

export type PushPressState = {
    pressedAt: number;
    firedThresholds: Set<number>;
    timers: Map<number, NodeJS.Timeout>;
};
