// InteractionView types and factory
// view.ts

import type {
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
    | { equals: number };

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
export type ViewCommandType = "tap" | "toggle" | "longPress" | "setAnalog" | "clearTimer";

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
    }
    | {
        resource: AnalogOutputResourceBase | VirtualAnalogOutputResourceBase;
        type: "setAnalog";
        min?: number;
        max?: number;
        step?: number;
        unit?: string;
    }
    | {
        resource: TimerResourceBase;
        type: "clearTimer";
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
export type StateDisplayStyle = "value" | "indicator" | "flash";

export type StateDisplayItem = {
    resource: ResourceBase<ResourceType>;
    label?: string;
    unit?: string;
    /** How to render this item on the tile. Default: "value".
     *  - "value": always visible, shows resource value as text
     *  - "indicator": small icon, lit when active, dim when inactive
     *  - "flash": icon blinks briefly on resource activation, then fades */
    style?: StateDisplayStyle;
    /** Custom icon for indicator/flash styles */
    icon?: string;
};

export type StateDisplayAggregation =
    | "sum" | "average" | "max" | "min" | "countActive";

export type ViewStateDisplay = {
    items: StateDisplayItem[];
    /** Controls how multiple "value"-style items are combined.
     *  Only applies to "value" items — "indicator" and "flash" items
     *  are always rendered individually regardless of this setting.
     *  - aggregation set -> combine all "value" items into one number
     *  - aggregation unset -> carousel through "value" items */
    aggregation?: StateDisplayAggregation;
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
/* The View                                                            */
/* ------------------------------------------------------------------ */
export type InteractionView = {
    id?: string;
    name?: string;
    description?: string;
    icon?: string;

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

    /** Secondary information shown on the tile */
    stateDisplay?: ViewStateDisplay;
};

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */
export function view(props: InteractionView): InteractionView {
    return { ...props };
}
