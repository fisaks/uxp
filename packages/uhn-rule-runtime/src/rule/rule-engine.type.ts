import type { ResourceBase, ResourceType, TriggerEvent } from "@uhn/blueprint";
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

export type PushPressState = {
    pressedAt: number;
    firedThresholds: Set<number>;
    timers: Map<number, NodeJS.Timeout>;
};
