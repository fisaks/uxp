import type { ResourceBase, ResourceType, TriggerEvent } from "@uhn/blueprint";

export type RuleExecutionControl = {
    lastRunAt?: number;
    suppressUntil?: number;
};

export type RuleTriggerEvent = {
    resource: ResourceBase<ResourceType>;
    event: TriggerEvent;
    timestamp: number;
    thresholdMs?: number;
};

export type PushPressState = {
    pressedAt: number;
    firedThresholds: Set<number>;
    timers: Map<number, NodeJS.Timeout>;
};
