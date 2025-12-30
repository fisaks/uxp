// packages/uhn-blueprint/src/rule.ts
import type {
    DigitalInputResourceBase,
    DigitalOutputResourceBase,
    ResourceBase,
    ResourceType,
    TimerResourceBase,
} from "./resource";

// --------- Runtime state value ---------
export type StateValue = boolean | number;
export type DigitalStateValue = Extract<StateValue, boolean>;
export type ResourceState = {
    value: StateValue | undefined; // undefined = unknown
    timestamp: number; // epoch ms
};



export type RuntimeReader = {
    getState(resource: ResourceBase<ResourceType>): ResourceState | undefined;
};

// --------- Events ---------
export type TriggerEvent =
    | "activated"
    | "deactivated"
    | "changed"
    | "tap"
    | "longPress"
    | "timerActivated"
    | "timerDeactivated";
export type TriggerSpec =
    | {
        type: "resource";
        resource: ResourceBase<ResourceType>;
        event: "activated" | "deactivated" | "changed";
    }
    | {
        type: "tap";
        resource: DigitalInputResourceBase;
    }
    | {
        type: "longPress";
        resource: DigitalInputResourceBase;
        thresholdMs: number;
    }
    | {
        type: "timer";
        resource: TimerResourceBase;
        event: "activated" | "deactivated";
    };

export type RuleCause = {
    resource: ResourceBase<ResourceType>;
    event: TriggerEvent;
    timestamp: number;
    // tap / longPress
    pressedMs?: number;
    thresholdMs?: number;
};

export type RuleTimers = {
    start(
        timer: TimerResourceBase,
        durationMs: number,
        mode?: "restart" | "startOnce"
    ): void;

    clear(timer: TimerResourceBase): void;

    isRunning(timer: TimerResourceBase): boolean;
};

export type RuleLogger = {
    info(msg: string, data?: unknown): void;
    warn(msg: string, data?: unknown): void;
    error(msg: string, data?: unknown): void;
};

// --------- Actions (runtime emits to host) ---------
export type RuleAction =
    | {
        type: "setOutput";
        resource: DigitalOutputResourceBase;
        value: DigitalStateValue
    }
    | {
        type: "emitSignal"; // optional: e.g. transient overrides
        resource: DigitalInputResourceBase;
        value: DigitalStateValue | undefined;
    }
    | {
        type: "log";
        level: "info" | "warn" | "error";
        message: string;
        data?: unknown;
    };

export type RuntimeRuleAction =
    | {
        type: "setOutput";
        resourceId: string;
        value: DigitalStateValue
    }
    | {
        type: "emitSignal"; // optional: e.g. transient overrides
        resourceId: string;
        value: DigitalStateValue | undefined;
    }
    | {
        type: "log";
        level: "info" | "warn" | "error";
        message: string;
        data?: unknown;
    };

// --------- Context ---------

export type RuleContext = {
    now: number;
    cause: RuleCause;
    runtime: RuntimeReader;
    timers: RuleTimers;
    logger: RuleLogger;
};


export type RulePlacement =
    | "auto"   // default: try edge first, escalate if needed
    | "master"; // author forces master-only execution


export type BlueprintRuleMeta = {
    id: string;
    name?: string;
    description?: string;

    placement?: RulePlacement; // default "auto"
    triggers: TriggerSpec[];

    // optional scheduling guards (per rule)
    debounceMs?: number;
    cooldownMs?: number;
    priority?: number;
};

export type BlueprintRule = BlueprintRuleMeta & {
    type: "rule";
    run(ctx: RuleContext): RuleAction[];
};

export type RuleBuilder = {
    placement(p: RulePlacement): RuleBuilder;

    onActivated(resource: DigitalInputResourceBase): RuleBuilder;
    onDeactivated(resource: DigitalInputResourceBase): RuleBuilder;
    onChanged(resource: DigitalInputResourceBase | DigitalOutputResourceBase): RuleBuilder;

    onTap(resource: DigitalInputResourceBase): RuleBuilder;
    onLongPress(resource: DigitalInputResourceBase, thresholdMs: number): RuleBuilder;

    onTimerActivated(timer: TimerResourceBase): RuleBuilder;
    onTimerDeactivated(timer: TimerResourceBase): RuleBuilder;

    priority(n: number): RuleBuilder;
    debounce(ms: number): RuleBuilder;
    cooldown(ms: number): RuleBuilder;

    run(fn: (ctx: RuleContext) => RuleAction[]): BlueprintRule;
};
export function rule(
    props: { id?: string; name?: string; description?: string }
): RuleBuilder {
    const meta: BlueprintRuleMeta = {
        id: props?.id!,
        name: props?.name,
        description: props?.description,
        placement: "auto",
        triggers: [],

    };

    const builder: RuleBuilder = {
        placement(p) {
            meta.placement = p;
            return this;
        },

        onActivated(resource) {
            meta.triggers.push({
                type: "resource",
                resource: resource,
                event: "activated",
            });
            return this;
        },

        onDeactivated(resource) {
            meta.triggers.push({
                type: "resource",
                resource: resource,
                event: "deactivated",
            });
            return this;
        },

        onChanged(resource) {
            meta.triggers.push({
                type: "resource",
                resource: resource,
                event: "changed",
            });
            return this;
        },

        onTap(resource) {
            meta.triggers.push({
                type: "tap",
                resource: resource,
            });
            return this;
        },

        onLongPress(resource, thresholdMs) {
            meta.triggers.push({
                type: "longPress",
                resource: resource,
                thresholdMs,
            });
            return this;
        },

        onTimerActivated(timer) {
            meta.triggers.push({
                type: "timer",
                resource: timer,
                event: "activated",
            });
            return this;
        },

        onTimerDeactivated(timer) {
            meta.triggers.push({
                type: "timer",
                resource: timer,
                event: "deactivated",
            });
            return this;
        },

        priority(n) {
            meta.priority = n;
            return this;
        },

        debounce(ms) {
            meta.debounceMs = ms;
            return this;
        },

        cooldown(ms) {
            meta.cooldownMs = ms;
            return this;
        },

        run(fn) {
            return {
                type: "rule",
                ...meta,
                run: fn,
            };
        },
    };
    return builder;
}