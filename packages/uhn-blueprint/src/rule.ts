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
export type TimerStateValue = Extract<StateValue, boolean>;
export type AnalogStateValue = Extract<StateValue, number>;
export type StateValueByResourceType<T extends ResourceType> =
    T extends "digitalInput" | "digitalOutput"
    ? DigitalStateValue
    : T extends "analogInput" | "analogOutput"
    ? AnalogStateValue
    : T extends "timer"
    ? TimerStateValue
    : never;
export type ResourceState = {
    value: StateValue | undefined; // undefined = unknown
    timestamp: number; // epoch ms
};


export type RuntimeReader = {
    getState<T extends ResourceType>(resource: ResourceBase<T>): StateValueByResourceType<T>;
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
export type RuleTrigger =
    | {
        kind: "resource";
        resource: ResourceBase<ResourceType>;
        event: "activated" | "deactivated" | "changed";
    }
    | {
        kind: "tap";
        resource: DigitalInputResourceBase;
    }
    | {
        kind: "longPress";
        resource: DigitalInputResourceBase;
        thresholdMs: number;
    }
    | {
        kind: "timer";
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
    ): "started" | "alreadyRunning" | "restarted";

    clear(timer: TimerResourceBase): "cleared" | "notRunning";

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
    };

/**
 * Typed helper for constructing arrays of {@link RuleAction}.
 *
 * This is an identity function at runtime, but at compile time it:
 * - Ensures that all elements in the array are valid {@link RuleAction}s.
 * - Preserves the tuple type of the input array (including literal types),
 *   which can be useful for further type-level operations.
 *
 * Usage:
 *   const actions = ruleActions([
 *       { type: "setOutput", resource: someOutput, value: true },
 *       { type: "emitSignal", resource: someInput, value: undefined },
 *   ]);
 */
export function ruleActions<T extends RuleAction[]>(actions: T): T {
    return actions;
}

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
    };

// --------- Context ---------

export type RuleContext = {
    cause: RuleCause;
    runtime: RuntimeReader;
    timers: RuleTimers;
    logger: RuleLogger;
    mute: MuteController;
};
/**
 * Controller to mute rule or resource triggers for a duration.
 * You can give an optional identifier to distinguish different mute reasons.
 * Using the same identifier in clearMute will only clear that specific mute.
 * If no identifier is given, all mutes for that resource/rule are cleared.
 */
export type MuteController = {
    resource(resource: ResourceBase<ResourceType>, durationMs: number, identifier?: string): void;
    rule(rule: BlueprintRule, durationMs: number, identifier?: string): void;
    clearMute(mute: ResourceBase<ResourceType> | BlueprintRule, identifier?: string): void;
}

export type RuleExecutionTarget =
    | "edge"   // rule runs on a single edge server
    | "master" // rule runs on master (multi-edge or author override)
    | "auto";  // runtime decides (timer-only or no-resource rules)


export type BlueprintRuleMeta = {
    id: string;
    name?: string;
    description?: string;

    executionTarget?: RuleExecutionTarget; // injected by build
    triggers: RuleTrigger[];

    // optional scheduling guards (per rule)
    suppressMs?: number;
    cooldownMs?: number;
    priority?: number;
};

export type BlueprintRule = BlueprintRuleMeta & {
    type: "rule";
    run(ctx: RuleContext): RuleAction[];
};
export const isBlueprintRule = (obj: unknown): obj is BlueprintRule => {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "type" in obj &&
        obj.type === "rule" &&
        "id" in obj &&
        typeof obj.id === "string"
        && "triggers" in obj &&
        Array.isArray(obj.triggers)
        && "run" in obj &&
        typeof obj.run === "function"
    );
}
export type RuleBuilder = {
    executionTarget(p: RuleExecutionTarget): RuleBuilder;

    onActivated(resource: DigitalInputResourceBase): RuleBuilder;
    onDeactivated(resource: DigitalInputResourceBase): RuleBuilder;
    onChanged(resource: DigitalInputResourceBase | DigitalOutputResourceBase): RuleBuilder;

    onTap(resource: DigitalInputResourceBase<"button">): RuleBuilder;
    onLongPress(resource: DigitalInputResourceBase<"button">, thresholdMs: number): RuleBuilder;

    onTimerActivated(timer: TimerResourceBase): RuleBuilder;
    onTimerDeactivated(timer: TimerResourceBase): RuleBuilder;

    priority(n: number): RuleBuilder;
    /**
    * Suppress: ignore noisy triggers.
    * After a triggering event, ignore further triggers for X milliseconds.
    * The rule only runs in response to an event; no execution is scheduled
    * after the suppress period ends.
    */
    suppress(ms: number): RuleBuilder;
    /**
    * Cooldown: block repeated executions.
    * After the rule runs, do not allow it to run again for X milliseconds.
    */
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
        triggers: [],
    };

    const builder: RuleBuilder = {
        executionTarget(p) {
            meta.executionTarget = p;
            return this;
        },

        onActivated(resource) {
            meta.triggers.push({
                kind: "resource",
                resource: resource,
                event: "activated",
            });
            return this;
        },

        onDeactivated(resource) {
            meta.triggers.push({
                kind: "resource",
                resource: resource,
                event: "deactivated",
            });
            return this;
        },

        onChanged(resource) {
            meta.triggers.push({
                kind: "resource",
                resource: resource,
                event: "changed",
            });
            return this;
        },

        onTap(resource) {
            meta.triggers.push({
                kind: "tap",
                resource: resource,
            });
            return this;
        },

        onLongPress(resource, thresholdMs) {
            meta.triggers.push({
                kind: "longPress",
                resource: resource,
                thresholdMs,
            });
            return this;
        },

        onTimerActivated(timer) {
            meta.triggers.push({
                kind: "timer",
                resource: timer,
                event: "activated",
            });
            return this;
        },

        onTimerDeactivated(timer) {
            meta.triggers.push({
                kind: "timer",
                resource: timer,
                event: "deactivated",
            });
            return this;
        },

        priority(n) {
            meta.priority = n;
            return this;
        },

        suppress(ms) {
            meta.suppressMs = ms;
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
