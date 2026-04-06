// InteractionView types and factory
// view.ts

import type { BlueprintIcon } from "./icon";
import { commandTypeDefaultIcon } from "./icon-defaults";
import type {
    ActionInputResourceBase,
    ActionMetaMap,
    ActionOutputResourceBase,
    AnalogOutputOption,
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

/* ------------------------------------------------------------------ */
/* State Source                                                        */
/* ------------------------------------------------------------------ */
export type ViewActiveCondition =
    | { above: number }
    | { below: number }
    | { equals: number | boolean };

export type ViewStateSource = {
    resource: ResourceBase<ResourceType>;
    /** Determines when this resource is considered "active".
     *  - For digital resources: optional — defaults to value === true
     *  - For analog/numeric resources: required when stateAggregation is
     *    digital ("any"/"all"), converts the numeric value to boolean
     *  - When stateAggregation is numeric ("sum"/"avg"/etc.): ignored,
     *    the raw numeric value is used directly in the aggregation */
    activeWhen?: ViewActiveCondition;
};

/* ------------------------------------------------------------------ */
/* Command                                                             */
/* ------------------------------------------------------------------ */
export type ViewCommandType = "tap" | "toggle" | "longPress" | "setAnalog" | "clearTimer" | "action" | "setActionOutput";

export type ViewCommandTarget =
    | {
        resource: DigitalInputResourceBase | VirtualDigitalInputResourceBase | ComplexResourceBase;
        type: "tap";
    }
    | {
        resource: DigitalInputResourceBase | VirtualDigitalInputResourceBase | DigitalOutputResourceBase;
        type: "toggle";
    }
    | {
        resource: DigitalInputResourceBase;
        type: "longPress";
        /** Duration in ms. Sent directly as a longPress event,
         *  no UI gesture detection — the UI fires it immediately on tap. */
        holdMs: number;
        /** When true, the edge simulates a physical hold (activate → wait holdMs → deactivate)
         *  so InputGestureEmitter detects the longPress from the state cycle.
         *  When false (default), a longPressCommand is forwarded directly to the runtime
         *  for instant rule execution. */
        simulateHold?: boolean;
    }
    | {
        resource: AnalogOutputResourceBase | VirtualAnalogOutputResourceBase;
        type: "setAnalog";
        min?: number;
        max?: number;
        step?: number;
        unit?: string;
        /** Value used when toggling "on" via tap. Falls back to max when omitted. */
        defaultOnValue?: number;
        /** Override resource-level options for this view command. */
        options?: AnalogOutputOption[];
    }
    | {
        resource: TimerResourceBase;
        type: "clearTimer";
    }
    | {
        resource: ActionInputResourceBase<any, any>;
        type: "action";
        action: string;
        /** Optional metadata sent with the action command (e.g. simulated action_duration). */
        metadata?: Record<string, unknown>;
    }
    | {
        resource: ActionOutputResourceBase<any>;
        type: "setActionOutput";
        action: string;
    };

export type ViewCommand = ViewCommandTarget & {
    /** Optional override for deactivation. Activation always uses the
     *  top-level resource/type. Only specify when deactivation needs
     *  a different target or command type. */
    onDeactivate?: ViewCommandTarget;
};

/* ------------------------------------------------------------------ */
/* State Display                                                       */
/* ------------------------------------------------------------------ */

/** Theme palette color tokens available for value-driven coloring. */
export type ThemePaletteColor = "success" | "warning" | "error" | "info" | "primary" | "secondary";

/** Rule for mapping a resource value to a theme palette color token.
 *  Rules are evaluated top-down — first match wins. */
export type ValueColorRule =
    | { above: number; color: ThemePaletteColor }
    | { below: number; color: ThemePaletteColor }
    | { equals: boolean | number; color: ThemePaletteColor };

/** Rule for mapping a resource value to an alternative icon.
 *  Rules are evaluated top-down — first match wins. */
export type ValueIconRule =
    | { above: number; icon: BlueprintIcon }
    | { below: number; icon: BlueprintIcon }
    | { equals: boolean | number; icon: BlueprintIcon };

/** Font size preset for hero values. Default: `"default"` (1.5rem). */
export type HeroFontSize = "tiny" | "small" | "default" | "large" | "x-large";

/** A value display item for `left`, `right`, or `hero` slots.
 *  Shows a formatted resource value with optional label and unit. */
export type DisplayValue = {
    resource: ResourceBase<ResourceType>;
    /** Text label (shown above value in flanking slots, omitted in hero). */
    label?: string;
    /** Icon shown instead of label text — label becomes tooltip. */
    icon?: BlueprintIcon;
    /** Unit suffix. Falls back to the resource's own unit if omitted. */
    unit?: string;
};

/** An icon display item for `topLeft`, `topCenter`, `topRight`, or `badge` slots.
 *  Shows an icon with optional tooltip, visibility control, and value-driven color/icon. */
export type DisplayIcon = {
    resource: ResourceBase<ResourceType>;
    icon: BlueprintIcon;
    /** Tooltip text, or `"value"` to show the formatted resource value. */
    tooltip?: string | "value";
    /** When to show this icon. Default: `"always"`. */
    showWhen?: "active" | "inactive" | "always";
    /** Value-driven color — first matching rule wins. Color is a theme palette token (e.g. `"success"`, `"warning"`, `"error"`). */
    colorMap?: ValueColorRule[];
    /** Value-driven icon override — first matching rule wins. */
    iconMap?: ValueIconRule[];
};

/** Slot-keyed state display configuration for InteractionView tiles. */
export type ViewStateDisplay = {
    topLeft?: DisplayIcon[];
    topCenter?: DisplayIcon[];
    topRight?: DisplayIcon[];
    left?: DisplayValue[];
    right?: DisplayValue[];
    badge?: DisplayIcon[];
    hero?: DisplayValue[];
    /** Font size for hero slot values. Default: `"default"` (1.5rem). */
    heroSize?: HeroFontSize;
};

/* ------------------------------------------------------------------ */
/* State Aggregation (primary state)                                   */
/* ------------------------------------------------------------------ */
/** Digital context ("any"/"all"): each stateFrom resource is boolean
 *  (or converted via per-item activeWhen), then aggregated.
 *  Numeric context ("sum"/"avg"/etc.): each resource contributes a
 *  number, aggregated to one value. Use view-level activeWhen to
 *  determine active/inactive from the result. */
export type ViewStateAggregation =
    | "any" | "all"
    | "sum" | "average" | "max" | "min";

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */
/** A control accessible from a view tile — rendered in the popover,
 *  optionally promoted to an inline slider on the tile. */
export type ViewControl = {
    resource: ResourceBase<ResourceType>;
    /** Display label in the popover */
    label?: string;
    /** Section group header in the popover */
    group?: string;
    /** Promote to inline tile control. Only the first analog resource
     *  with inline: true renders as a slider. Digital inline is not
     *  yet supported (flag is silently ignored). Ignored when the
     *  view's command is setAnalog (already has a slider). */
    inline?: boolean;
};

/* ------------------------------------------------------------------ */
/* The View                                                            */
/* ------------------------------------------------------------------ */
export type InteractionView = {
    id?: string;
    name?: string;
    /** State-dependent display name. Resolution order:
     *  1. First active resource in `resources` → its name
     *  2. `active` → generic active name
     *  3. `inactive` → when everything is off
     *  4. Falls back to `name` */
    nameMap?: {
        active?: string;
        inactive?: string;
        resources?: { resource: ResourceBase<ResourceType>; name: string }[];
    };
    description?: string;
    /** Alternative search terms (e.g. ["main light", "overhead"] for a ceiling light). */
    keywords?: string[];
    icon?: BlueprintIcon;

    /** Primary state sources — drives icon active/inactive or numeric value */
    stateFrom: ViewStateSource[];
    /** How to aggregate multiple stateFrom sources. Default: "any" */
    stateAggregation?: ViewStateAggregation;
    /** When stateAggregation is numeric (sum/avg/max/min), determines
     *  when the aggregated value is considered "active" for the icon */
    activeWhen?: ViewActiveCondition;

    /** Command target + interaction behavior.
     *  - tap/toggle/longPress -> digital tile (tap to interact)
     *  - setAnalog -> analog tile (inline slider + tap-to-max/min)
     *  - omitted -> display-only tile */
    command?: ViewCommand;

    /** Action side effects fired alongside the primary command on tap.
     *  When a physical Zigbee button is bound to a light, the button controls
     *  the light directly (Zigbee binding) AND reports the press to Z2M, which
     *  triggers rules for additional behavior (timers, muting, logging, etc.).
     *  The UI view must replicate both: the primary command controls the device
     *  (same as the binding does physically), and side effects fire the same
     *  action events so the rules also execute from the UI. */
    sideEffects?: ActionSideEffect[];

    /** Secondary information shown on the tile */
    stateDisplay?: ViewStateDisplay;

    /** Additional controls accessible from this view tile.
     *  When present (and more than one or non-inline), a TuneIcon overlay
     *  appears on the tile icon and clicking it opens a popover with all
     *  controls. The view's command is also shown at the top of the popover. */
    controls?: ViewControl[];

    /** When true, controls popover and inline controls remain enabled even when
     *  the view is inactive (stateFrom evaluates to false/0). Useful for group
     *  controllers where you need to adjust members even when all are off. */
    alwaysEnableControls?: boolean;
};

/* ------------------------------------------------------------------ */
/* Side Effects                                                        */
/* ------------------------------------------------------------------ */
/** An action event fired as a side effect alongside the primary view command. */
export type ActionSideEffect = {
    resource: ActionInputResourceBase<any, any>;
    action: string;
    metadata?: Record<string, unknown>;
};

/**
 * Type-safe helper for building an action side effect.
 * Action and metadata are constrained by the resource's type parameters.
 */
export function actionSideEffect<TActions extends string, TAction extends TActions, TMeta extends ActionMetaMap<TActions>>(opts: {
    resource: ActionInputResourceBase<TActions, TMeta, any, any, any>;
    action: TAction;
} & ([TMeta[TAction]] extends [never] ? {} : { metadata: TMeta[TAction] })): ActionSideEffect {
    return opts as ActionSideEffect;
}

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */
export function view(props: InteractionView): InteractionView {
    const stateFromIcon = props.stateFrom.length === 1 ? props.stateFrom[0].resource.icon : undefined;
    return {
        ...props,
        icon: props.icon ?? stateFromIcon ?? (props.command ? commandTypeDefaultIcon[props.command.type] : "status:dashboard"),
    };
}

/* ------------------------------------------------------------------ */
/* Command factory                                                     */
/* ------------------------------------------------------------------ */

/** Create a toggle command. */
export function viewCommand(opts: {
    resource: DigitalInputResourceBase | VirtualDigitalInputResourceBase | DigitalOutputResourceBase;
    type: "toggle";
    onDeactivate?: ViewCommandTarget;
}): ViewCommand;
/** Create a tap command. */
export function viewCommand(opts: {
    resource: DigitalInputResourceBase | VirtualDigitalInputResourceBase | ComplexResourceBase;
    type: "tap";
    onDeactivate?: ViewCommandTarget;
}): ViewCommand;
/** Create a clearTimer command. */
export function viewCommand(opts: {
    resource: TimerResourceBase;
    type: "clearTimer";
    onDeactivate?: ViewCommandTarget;
}): ViewCommand;
/** Create a longPress command. */
export function viewCommand(opts: {
    resource: DigitalInputResourceBase;
    type: "longPress";
    holdMs: number;
    simulateHold?: boolean;
    onDeactivate?: ViewCommandTarget;
}): ViewCommand;
/** Create a setAnalog command. */
export function viewCommand(opts: {
    resource: AnalogOutputResourceBase | VirtualAnalogOutputResourceBase;
    type: "setAnalog";
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    defaultOnValue?: number;
    options?: AnalogOutputOption[];
    onDeactivate?: ViewCommandTarget;
}): ViewCommand;
/** Create an action command with per-action type-safe metadata. */
export function viewCommand<TActions extends string, TAction extends TActions, TMeta extends ActionMetaMap<TActions>>(opts: {
    resource: ActionInputResourceBase<TActions, TMeta, any, any, any>;
    type: "action";
    action: TAction;
    onDeactivate?: ViewCommandTarget;
} & ([TMeta[TAction]] extends [never] ? {} : { metadata: TMeta[TAction] })): ViewCommand;
/** Create a setActionOutput command for write-only transient device effects. */
export function viewCommand<TActions extends string, TAction extends TActions>(opts: {
    resource: ActionOutputResourceBase<TActions, any, any, any>;
    type: "setActionOutput";
    action: TAction;
    onDeactivate?: ViewCommandTarget;
}): ViewCommand;
export function viewCommand(opts: any): ViewCommand {
    return opts;
}