// packages/uhn-blueprint/src/rule.ts
import type {
    ActionInputResourceBase,
    ActionMetaMap,
    ActionOutputResourceBase,
    AnalogInputResourceBase,
    AnalogOutputResourceBase,
    ComplexResourceBase,
    DigitalInputResourceBase,
    DigitalOutputResourceBase,
    ResourceBase,
    ResourceType,
    TimerResourceBase,
    VirtualAnalogOutputResourceBase,
    VirtualDigitalInputResourceBase,
} from "./resource";
import type { BlueprintScene } from "./scene";
import type { BlueprintPhase } from "./schedule";

// --------- Runtime state value ---------
export type StateValue = boolean | number;
export type DigitalStateValue = Extract<StateValue, boolean>;
export type TimerStateValue = Extract<StateValue, boolean>;
export type AnalogStateValue = Extract<StateValue, number>;
export type StateValueByResourceType<T extends ResourceType> =
    T extends "digitalInput" | "digitalOutput" | "virtualDigitalInput"
    ? DigitalStateValue
    : T extends "analogInput" | "analogOutput" | "virtualAnalogOutput"
    ? AnalogStateValue
    : T extends "timer"
    ? TimerStateValue
    : T extends "complex"
    ? StateValue
    : T extends "actionInput" | "actionOutput"
    ? never
    : never;
export type ResourceState = {
    value: StateValue | undefined; // undefined = unknown
    timestamp: number; // epoch ms
};


export type StateReader = {
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
    | "timerDeactivated"
    | "thresholdAbove"
    | "thresholdBelow"
    | "action"
    | "schedule";

export type NumericTriggerOptions = { hysteresis?: number };

export type RuleTrigger =
    | {
        kind: "resource";
        resource: ResourceBase<ResourceType>;
        event: "activated" | "deactivated" | "changed";
        /** Only meaningful for numeric resources (analog/complex) with event "changed". Ignored for digital. */
        hysteresis?: number;
    }
    | {
        kind: "threshold";
        resource: AnalogInputResourceBase | AnalogOutputResourceBase | ComplexResourceBase;
        direction: "above" | "below";
        threshold: number;
        hysteresis?: number;
    }
    | {
        kind: "tap";
        resource: DigitalInputResourceBase | ComplexResourceBase | VirtualDigitalInputResourceBase;
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
    }
    | {
        kind: "action";
        resource: ActionInputResourceBase<any, any>;
        action: string;
    }
    | {
        kind: "schedule";
        phase: BlueprintPhase;
    };

export type ResourceRuleCause = {
    resource: ResourceBase<ResourceType>;
    event: Exclude<TriggerEvent, "schedule">;
    timestamp: number;
    // tap / longPress
    pressedMs?: number;
    thresholdMs?: number;
    // action (actionInput)
    action?: string;
    metadata?: unknown;
    /** Depth counter for loop prevention. 0 for physical/UI events, incremented for rule-emitted actions. */
    depth?: number;
};

export type ScheduleRuleCause = {
    event: "schedule";
    timestamp: number;
    phase: BlueprintPhase;
};

export type RuleCause = ResourceRuleCause | ScheduleRuleCause;

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
    trace(msg: string, data?: unknown): void;
    debug(msg: string, data?: unknown): void;
    info(msg: string, data?: unknown): void;
    warn(msg: string, data?: unknown): void;
    error(msg: string, data?: unknown): void;
};

// --------- Actions (runtime emits to host) ---------
export type RuleAction =
    | {
        type: "setDigitalOutput";
        resource: DigitalOutputResourceBase;
        value: DigitalStateValue
    }
    | {
        type: "setAnalogOutput";
        resource: AnalogOutputResourceBase | VirtualAnalogOutputResourceBase;
        value: AnalogStateValue
    }
    | {
        type: "emitSignal"; // optional: e.g. transient overrides
        resource: DigitalInputResourceBase | VirtualDigitalInputResourceBase;
        value: DigitalStateValue | undefined;
    }
    | {
        type: "emitAction";
        resource: ActionInputResourceBase<any, any>;
        action: string;
        metadata?: Record<string, unknown>;
    }
    | {
        type: "setActionOutput";
        resource: ActionOutputResourceBase<any>;
        action: string;
    }
    | {
        type: "setVirtualState";
        resource: VirtualAnalogOutputResourceBase | VirtualDigitalInputResourceBase;
        value: AnalogStateValue | DigitalStateValue;
    }
    | {
        type: "activateScene";
        scene: BlueprintScene;
    };


/**
 * Type guard that narrows `ctx.cause` based on the triggering resource and action.
 *
 * For actionInput resources, narrows `cause.action` to the specific action string
 * and `cause.metadata` to the per-action metadata type from the resource's `TMeta` map.
 *
 * Usage:
 *   if (isCausedBy(ctx, panel, "arrow_left_release")) {
 *       ctx.cause.action    // "arrow_left_release"
 *       ctx.cause.metadata  // { action_duration?: number } (from TMeta)
 *   }
 *
 * For non-action resources, checks that the cause resource matches:
 *   if (isCausedBy(ctx, someButton)) {
 *       // ctx.cause.resource is someButton
 *   }
 */
export function isCausedBy<
    TActions extends string,
    TAction extends TActions,
    TMeta extends ActionMetaMap<TActions>,
>(
    ctx: RuleContext,
    resource: ActionInputResourceBase<TActions, TMeta, any, any, any>,
    action: TAction,
): ctx is RuleContext & { cause: RuleCause & { action: TAction; metadata: TMeta[TAction] } };
export function isCausedBy(ctx: RuleContext, resource: ResourceBase<ResourceType>): boolean;
export function isCausedBy(ctx: RuleContext, resource: ResourceBase<ResourceType>, action?: string): boolean {
    if (ctx.cause.event === "schedule") return false;
    if (ctx.cause.resource.id !== resource.id) return false;
    if (action !== undefined) return ctx.cause.action === action;
    return true;
}

/**
 * Type guard that narrows `ctx.cause` to a schedule phase cause.
 *
 * Usage:
 *   if (isCausedBySchedulePhase(ctx, engineHeater.phases.on)) {
 *       // ctx.cause.phase === engineHeater.phases.on
 *   }
 */
export function isCausedBySchedulePhase(ctx: RuleContext, phase: BlueprintPhase): ctx is RuleContext & { cause: ScheduleRuleCause } {
    return ctx.cause.event === "schedule" && ctx.cause.phase === phase;
}

/**
 * Type-safe factory for constructing a single {@link RuleAction}.
 *
 * Usage:
 *   ruleAction({ type: "setDigitalOutput", resource: light, value: true })
 *   ruleAction({ type: "setAnalogOutput", resource: dimmer, value: 80 })
 *   ruleAction({ type: "emitSignal", resource: vdi, value: undefined })
 *   ruleAction({ type: "emitAction", resource: panel, action: "toggle" })
 *   ruleAction({ type: "activateScene", scene: movieScene })
 */
export function ruleAction(opts: { type: "setDigitalOutput"; resource: DigitalOutputResourceBase; value: DigitalStateValue }): RuleAction;
export function ruleAction(opts: { type: "setAnalogOutput"; resource: AnalogOutputResourceBase | VirtualAnalogOutputResourceBase; value: AnalogStateValue }): RuleAction;
export function ruleAction(opts: { type: "emitSignal"; resource: DigitalInputResourceBase | VirtualDigitalInputResourceBase; value: DigitalStateValue | undefined }): RuleAction;
export function ruleAction<TActions extends string, TAction extends TActions, TMeta extends ActionMetaMap<TActions>>(
    opts: { type: "emitAction"; resource: ActionInputResourceBase<TActions, TMeta, any, any, any>; action: TAction }
        & ([TMeta[TAction]] extends [never] ? {} : { metadata: TMeta[TAction] })
): RuleAction;
export function ruleAction<TActions extends string, TAction extends TActions>(
    opts: { type: "setActionOutput"; resource: ActionOutputResourceBase<TActions, any, any, any>; action: TAction }
): RuleAction;
/** Set a virtual resource's state silently (updates UI, does not trigger rules). */
export function ruleAction(opts: { type: "setVirtualState"; resource: VirtualAnalogOutputResourceBase; value: AnalogStateValue }): RuleAction;
export function ruleAction(opts: { type: "setVirtualState"; resource: VirtualDigitalInputResourceBase; value: DigitalStateValue }): RuleAction;
export function ruleAction(opts: { type: "activateScene"; scene: BlueprintScene }): RuleAction;
export function ruleAction(opts: any): RuleAction {
    return opts;
}

/**
 * Serializable action emitted over IPC from the rule runtime to the host (Go edge / master).
 *
 * Differs from {@link RuleAction} in two ways:
 * - References resources by `resourceId` string instead of full resource objects,
 *   so it can cross the IPC/JSON boundary.
 * - Includes timer actions (`timerStart`, `timerClear`) that are generated
 *   internally by the rule engine (master mode), not authored by rule writers.
 */
export type RuntimeRuleAction =
    | {
        type: "setDigitalOutput";
        resourceId: string;
        value: DigitalStateValue
    }
    | {
        type: "setAnalogOutput";
        resourceId: string;
        value: AnalogStateValue
    }
    | {
        type: "emitSignal"; // optional: e.g. transient overrides
        resourceId: string;
        value: DigitalStateValue | undefined;
    }
    | {
        type: "timerStart";
        resourceId: string;
        durationMs: number;
        mode?: "restart" | "startOnce";
    }
    | {
        type: "timerClear";
        resourceId: string;
    }
    | {
        type: "mute";
        targetType: "rule" | "resource";
        targetId: string;
        expiresAt: number;
        identifier?: string;
    }
    | {
        type: "clearMute";
        targetType: "rule" | "resource";
        targetId: string;
        identifier?: string;
    }
    | {
        type: "emitAction";
        resourceId: string;
        action: string;
        metadata?: Record<string, unknown>;
        depth: number;
    }
    | {
        type: "setActionOutput";
        resourceId: string;
        action: string;
    }
    | {
        type: "setVirtualState";
        resourceId: string;
        value: AnalogStateValue | DigitalStateValue;
    }
    | {
        type: "activateScene";
        sceneId: string;
    };

// --------- Context ---------

// --------- Interval ---------

export type IntervalCallbackContext = {
    runtime: StateReader;
    logger: RuleLogger;
    /** Stop the interval from within the callback. */
    stop(): void;
    /** Change the delay before the next tick. Minimum 50ms. */
    setNextInterval(ms: number): void;
    /** Set params that will be available as `params` on the next tick. */
    setNextParams(params: Record<string, unknown>): void;
    /** Params set by the previous tick via `setNextParams()`, or the initial value. */
    params: Record<string, unknown> | undefined;
    /** Zero-based iteration counter. */
    iteration: number;
};

export type IntervalOptions = {
    intervalMs: number;
    maxIterations?: number;
    initialParams?: Record<string, unknown>;
    /** Fire the first tick immediately instead of waiting for `intervalMs`. Default: false. */
    fireImmediately?: boolean;
};

export type IntervalController = {
    start(id: string, options: IntervalOptions, callback: (ctx: IntervalCallbackContext) => RuleAction[]): void;
    stop(id: string): void;
    isRunning(id: string): boolean;
};

// --------- Context ---------

export type RuleContext = {
    cause: RuleCause;
    runtime: StateReader;
    timers: RuleTimers;
    logger: RuleLogger;
    mute: MuteController;
    interval: IntervalController;
};
/**
 * Controller to mute rule or resource triggers for a duration.
 * You can give an optional identifier to distinguish different mute reasons.
 * Using the same identifier in clearMute will only clear that specific mute.
 * If no identifier is given, all mutes for that resource/rule are cleared.
 *
 * Note: mutes are held in memory and do not survive process restarts.
 */
export type MuteController = {
    resource(resource: ResourceBase<ResourceType>, durationMs: number, identifier?: string): void;
    rule(rule: BlueprintRule, durationMs: number, identifier?: string): void;
    clearMute(mute: ResourceBase<ResourceType> | BlueprintRule, identifier?: string): void;
}

export type RuleExecutionTarget =
    | "master" // rule runs on master (multi-edge or author override)
    | (string & {}); // edge name (e.g. "edge1") — rule runs on that specific edge


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

    /** Optional hint listing resources this rule's actions typically affect.
     *  Used by the UI to show action targets alongside trigger resources. */
    actionHints?: ResourceBase<ResourceType>[];
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

    onActivated(resource: DigitalInputResourceBase | DigitalOutputResourceBase | AnalogOutputResourceBase | ComplexResourceBase | VirtualDigitalInputResourceBase | VirtualAnalogOutputResourceBase): RuleBuilder;
    onDeactivated(resource: DigitalInputResourceBase | DigitalOutputResourceBase | AnalogOutputResourceBase | ComplexResourceBase | VirtualDigitalInputResourceBase | VirtualAnalogOutputResourceBase): RuleBuilder;
    onChanged(resource: DigitalInputResourceBase | DigitalOutputResourceBase | AnalogInputResourceBase | AnalogOutputResourceBase | ComplexResourceBase | VirtualDigitalInputResourceBase | VirtualAnalogOutputResourceBase, opts?: NumericTriggerOptions): RuleBuilder;

    onAbove(resource: AnalogInputResourceBase | AnalogOutputResourceBase | ComplexResourceBase, threshold: number, opts?: NumericTriggerOptions): RuleBuilder;
    onBelow(resource: AnalogInputResourceBase | AnalogOutputResourceBase | ComplexResourceBase, threshold: number, opts?: NumericTriggerOptions): RuleBuilder;

    onTap(resource: DigitalInputResourceBase<"button"> | ComplexResourceBase | VirtualDigitalInputResourceBase): RuleBuilder;
    onLongPress(resource: DigitalInputResourceBase<"button">, thresholdMs: number): RuleBuilder;

    onAction<TActions extends string>(resource: ActionInputResourceBase<TActions, any>, action: TActions): RuleBuilder;

    onTimerActivated(timer: TimerResourceBase): RuleBuilder;
    onTimerDeactivated(timer: TimerResourceBase): RuleBuilder;

    onSchedulePhase(phase: BlueprintPhase): RuleBuilder;

    priority(n: number): RuleBuilder;
    /** Hint listing resources this rule's actions typically affect.
     *  Shown in the UI alongside trigger resources for testing. */
    actionHints(...resources: ResourceBase<ResourceType>[]): RuleBuilder;
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

        onChanged(resource, opts) {
            meta.triggers.push({
                kind: "resource",
                resource: resource,
                event: "changed",
                ...(opts?.hysteresis !== undefined && { hysteresis: opts.hysteresis }),
            });
            return this;
        },

        onAbove(resource, threshold, opts) {
            meta.triggers.push({
                kind: "threshold",
                resource: resource,
                direction: "above",
                threshold,
                ...(opts?.hysteresis !== undefined && { hysteresis: opts.hysteresis }),
            });
            return this;
        },

        onBelow(resource, threshold, opts) {
            meta.triggers.push({
                kind: "threshold",
                resource: resource,
                direction: "below",
                threshold,
                ...(opts?.hysteresis !== undefined && { hysteresis: opts.hysteresis }),
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

        onAction(resource, action) {
            meta.triggers.push({
                kind: "action",
                resource: resource,
                action,
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

        onSchedulePhase(phase) {
            meta.triggers.push({
                kind: "schedule",
                phase,
            });
            return this;
        },

        priority(n) {
            meta.priority = n;
            return this;
        },

        actionHints(...resources) {
            meta.actionHints = resources;
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
