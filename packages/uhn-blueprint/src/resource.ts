// Resource Types and Bases
// resource.ts

import { BlueprintIcon } from "./icon";

export type PhysicalResourceType = "digitalInput" | "digitalOutput" | "analogInput" | "analogOutput" | "actionInput" | "actionOutput";
export type LogicalResourceType = "timer" | "complex" | "virtualDigitalInput" | "virtualAnalogOutput";
export type ResourceType = PhysicalResourceType | LogicalResourceType;

export type ResourceBase<TType extends ResourceType> = {
    id?: string;
    name?: string;
    description?: string;
    /** Alternative search terms (e.g. ["main light", "overhead"] for a ceiling light). */
    keywords?: string[];
    type: TType;
    /** Override the default type-based icon. Uses BlueprintIcon names (e.g. "lighting:bulb"). */
    icon?: BlueprintIcon;
};

export type PhysicalResourceBase<
    TType extends PhysicalResourceType,
    TEdge extends string = string,
    TDevice extends string | number = string,
> = ResourceBase<TType> & {
    edge: TEdge;
    device: TDevice;
    pin: number | string;
};

export type LogicalResourceBase<
    TType extends LogicalResourceType,
    THost extends string = string
> = ResourceBase<TType> & {
    host: THost;
};

export function isPhysicalResourceType(type: ResourceType): type is PhysicalResourceType {
    return type === "digitalInput" || type === "digitalOutput" || type === "analogInput" || type === "analogOutput" || type === "actionInput" || type === "actionOutput";
}

export function isLogicalResourceType(type: ResourceType): type is LogicalResourceType {
    return type === "timer" || type === "complex" || type === "virtualDigitalInput" || type === "virtualAnalogOutput";
}

export type InputType = "toggle" | "push";
export type BaseInputKind = "button" | "pir" | "lightSensor";
export type BaseOutputKind = "relay" | "socket" | "light" | "indicator";
export type InputKind = BaseInputKind | (string & {});
export type OutputKind = BaseOutputKind | (string & {});

export type BaseAnalogInputKind = "temperature" | "humidity" | "power" | "current" | "voltage" | "battery" | "energy";
export type BaseAnalogOutputKind = "dimmer" | "valve" | "pwm" | "colorTemp";
export type AnalogInputKind = BaseAnalogInputKind | (string & {});
export type AnalogOutputKind = BaseAnalogOutputKind | (string & {});
// Digital Input Resource (generic)
export type DigitalInputResourceBase<
    TInputKind extends InputKind = InputKind,
    TEdge extends string = string,
    TDevice extends string | number = string,
> = PhysicalResourceBase<"digitalInput", TEdge, TDevice> & {
    inputKind: TInputKind; //defined by project like "button" | "pir" | "lightSensor" etc.
    inputType: InputType;//"toggle" | "push"
};

// Digital Output Resource (generic)
export type DigitalOutputResourceBase<
    TOutputKind extends OutputKind = OutputKind,
    TEdge extends string = string,
    TDevice extends string | number = string,
> = PhysicalResourceBase<"digitalOutput", TEdge, TDevice> & {
    outputKind: TOutputKind; //defined by project like "relay" | "socket" | "light" | "indicator" etc
};


// Analog Input Resource (generic)
export type AnalogInputResourceBase<
    TInputKind extends AnalogInputKind = AnalogInputKind,
    TEdge extends string = string,
    TDevice extends string | number = string,
> = PhysicalResourceBase<"analogInput", TEdge, TDevice> & {
    analogInputKind: TInputKind;
    /** Unit label for display (e.g. "°C", "%", "W") */
    unit?: string;
    /** Number of decimal places for display and edge reporting precision.
     *  Controls UI formatting and edge transport rounding before change detection,
     *  reducing unnecessary updates from noisy sensors (e.g. 0 for voltage, 2 for current). */
    decimalPrecision?: number;
};

// Analog Output Option (for discrete named values, e.g. effect modes)
export type AnalogOutputOption = {
    value: number;
    label: string;
};

// Analog Output Resource (generic)
export type AnalogOutputResourceBase<
    TOutputKind extends AnalogOutputKind = AnalogOutputKind,
    TEdge extends string = string,
    TDevice extends string | number = string,
> = PhysicalResourceBase<"analogOutput", TEdge, TDevice> & {
    analogOutputKind: TOutputKind;
    /** Minimum settable value. Default: 0 */
    min?: number;
    /** Maximum settable value. Default: 65535 */
    max?: number;
    /** Step increment for value changes (e.g. 1 for integer, 5 for coarse). Default: 1 */
    step?: number;
    /** Unit label for display (e.g. "%", "rpm") */
    unit?: string;
    /** Value used when toggling "on" via tap. Falls back to max when omitted. */
    defaultOnValue?: number;
    /** Named discrete values. When present, UI renders a select instead of a slider. */
    options?: AnalogOutputOption[];
    /** Number of decimal places for display and reporting precision. */
    decimalPrecision?: number;
};

export type TimerResourceBase<THost extends string = string> = LogicalResourceBase<"timer", THost>;

// Virtual Input Resource — software-only button (no physical device)
export type VirtualDigitalInputResourceBase<THost extends string = string> = LogicalResourceBase<"virtualDigitalInput", THost> & {
    inputType: InputType;
};

// Virtual Analog Output Resource — software-only analog output (no physical device)
export type VirtualAnalogOutputResourceBase<THost extends string = string> = LogicalResourceBase<"virtualAnalogOutput", THost> & {
    /** Minimum settable value. Default: 0 */
    min?: number;
    /** Maximum settable value. Default: 65535 */
    max?: number;
    /** Step increment for value changes. Default: 1 */
    step?: number;
    /** Unit label for display (e.g. "%", "rpm") */
    unit?: string;
    /** Value used when toggling "on" via tap. Falls back to max when omitted. */
    defaultOnValue?: number;
    /** Named discrete values. When present, UI renders a select instead of a slider. */
    options?: AnalogOutputOption[];
};

// Complex (Multi-Physical) Resource

/** Compute function that derives a value from sub-resource states */
export type ComplexComputeFn = (values: Map<ResourceBase<ResourceType>, boolean | number>) => boolean | number;

export type ComplexSubResourceRef = {
    resource: ResourceBase<ResourceType>;
    /** Display label override within the complex resource popover */
    label?: string;
    /** Section group header. When set, starts a new visual group in the popover.
     *  Subsequent items without group belong to the same section. */
    group?: string;
};

// Action Input Resource — transient device events (Zigbee button presses, etc.)
export type BaseActionInputKind = "button" | "remote";
export type ActionInputKind = BaseActionInputKind | (string & {});

/** Per-action metadata map. Keys are action names, values are metadata types.
 *  `never` = no metadata for that action. Import tool generates all as `never`;
 *  author updates specific actions when metadata is discovered from runtime logs. */
export type ActionMetaMap<TActions extends string> = { [K in TActions]?: unknown };

export type ActionInputResourceBase<
    TActions extends string = string,
    TMeta extends ActionMetaMap<TActions> = { [K in TActions]: never },
    TActionInputKind extends ActionInputKind = ActionInputKind,
    TEdge extends string = string,
    TDevice extends string | number = string,
> = PhysicalResourceBase<"actionInput", TEdge, TDevice> & {
    actionInputKind: TActionInputKind;
    actions: TActions[];
    /** Phantom type for per-action metadata — not set at runtime, only used for type inference */
    _meta?: TMeta;
};

// Action Output Resource — transient write-only commands TO device (light effects, etc.)
export type BaseActionOutputKind = "effect" | "command";
export type ActionOutputKind = BaseActionOutputKind | (string & {});

export type ActionOutputResourceBase<
    TActions extends string = string,
    TActionOutputKind extends ActionOutputKind = ActionOutputKind,
    TEdge extends string = string,
    TDevice extends string | number = string,
> = PhysicalResourceBase<"actionOutput", TEdge, TDevice> & {
    actionOutputKind: TActionOutputKind;
    actions: TActions[];
};

export type ComplexResourceBase<THost extends string = string> = LogicalResourceBase<"complex", THost> & {
    /** Compute function that derives this resource's state from dependency values */
    computeFn: ComplexComputeFn;
    /** Resources whose state values are passed to computeFn (can differ from subResources) */
    computeResources: ResourceBase<ResourceType>[];
    /** Unit label for display (e.g. "W", "%") */
    unit?: string;
    /** Label shown beside the icon in tiles (e.g. "Total", "Sum"). */
    stateLabel?: string;
    /** The numeric value that represents the inactive/off state. Active when computed value !== inactiveValue. Default: 0 */
    inactiveValue?: number;
    /** When true, short clicks send a tap command (for rule triggers). When false, all clicks open the popover. Default: false */
    emitsTap?: boolean;
    /** Ordered list of sub-resource references (for UI popover) */
    subResources: ComplexSubResourceRef[];
};
