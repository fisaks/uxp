// Resource Types and Bases
// resource.ts
export type ResourceType = "digitalInput" | "digitalOutput" | "analogInput" | "analogOutput" | "timer" | "complex";
export type ResourceBase<TType extends ResourceType> = {
    id?: string;
    name?: string;
    description?: string;
    type: TType;
    edge: string;
    device?: string;
    pin?: number;
    /** Hide this resource from the main grid. It remains accessible in complex resource popovers. */
    hidden?: boolean;
};
export type InputType = "toggle" | "push";
export type BaseInputKind = "button" | "pir" | "lightSensor";
export type BaseOutputKind = "relay" | "socket" | "light" | "indicator";
export type InputKind = BaseInputKind | (string & {});
export type OutputKind = BaseOutputKind | (string & {});

export type BaseAnalogInputKind = "temperature" | "humidity" | "power" | "current";
export type BaseAnalogOutputKind = "dimmer" | "valve" | "pwm";
export type AnalogInputKind = BaseAnalogInputKind | (string & {});
export type AnalogOutputKind = BaseAnalogOutputKind | (string & {});
// Digital Input Resource (generic)
export type DigitalInputResourceBase<
    TInputKind extends InputKind = InputKind,
    TEdge extends string = string,
    TDevice extends string | number = string,
    TPin extends number = number
> = ResourceBase<"digitalInput"> & {
    edge: TEdge;
    device: TDevice;
    pin: TPin;
    inputKind: TInputKind; //defined by project like "button" | "pir" | "lightSensor" etc.
    inputType: InputType;//"toggle" | "push"
};

// Digital Output Resource (generic)
export type DigitalOutputResourceBase<
    TOutputKind extends OutputKind = OutputKind,
    TEdge extends string = string,
    TDevice extends string | number = string,
    TPin extends number = number
> = ResourceBase<"digitalOutput"> & {
    edge: TEdge;
    device: TDevice;
    pin: TPin;
    outputKind: TOutputKind; //defined by project like "relay" | "socket" | "light" | "indicator" etc
};


// Analog Input Resource (generic)
export type AnalogInputResourceBase<
    TInputKind extends AnalogInputKind = AnalogInputKind,
    TEdge extends string = string,
    TDevice extends string | number = string,
    TPin extends number = number
> = ResourceBase<"analogInput"> & {
    edge: TEdge;
    device: TDevice;
    pin: TPin;
    analogInputKind: TInputKind;
    /** Unit label for display (e.g. "°C", "%", "W") */
    unit?: string;
};

// Analog Output Resource (generic)
export type AnalogOutputResourceBase<
    TOutputKind extends AnalogOutputKind = AnalogOutputKind,
    TEdge extends string = string,
    TDevice extends string | number = string,
    TPin extends number = number
> = ResourceBase<"analogOutput"> & {
    edge: TEdge;
    device: TDevice;
    pin: TPin;
    analogOutputKind: TOutputKind;
    /** Minimum settable value. Default: 0 */
    min?: number;
    /** Maximum settable value. Default: 65535 */
    max?: number;
    /** Step increment for value changes (e.g. 1 for integer, 5 for coarse). Default: 1 */
    step?: number;
    /** Unit label for display (e.g. "%", "rpm") */
    unit?: string;
};

export type TimerResourceBase<TEdge extends string = string> = ResourceBase<"timer"> & {
    edge: TEdge;
};

// Complex (Multi-Physical) Resource

/** Compute function that derives a value from sub-resource states */
export type ComplexComputeFn = (values: Map<ResourceBase<ResourceType>, boolean | number>) => boolean | number;

/** How the complex tile summarizes its sub-resources on the grid */
export type ComplexTileSummaryConfig =
    | { mode: "primary"; resource: ResourceBase<ResourceType> }
    | { mode: "carousel"; resources: ResourceBase<ResourceType>[]; intervalMs?: number }
    | { mode: "computed"; fn: ComplexComputeFn; resources: ResourceBase<ResourceType>[]; unit?: string };

export type ComplexSubResourceRef = {
    resource: ResourceBase<ResourceType>;
    /** Display label override within the complex resource popover */
    label?: string;
    /** Section group header. When set, starts a new visual group in the popover.
     *  Subsequent items without group belong to the same section. */
    group?: string;
};

export type ComplexResourceBase<TEdge extends string = string> = ResourceBase<"complex"> & {
    edge: TEdge;
    /** Ordered list of sub-resource references */
    subResources: ComplexSubResourceRef[];
    /** How the tile summary displays. Default: first sub-resource as primary */
    tileSummary?: ComplexTileSummaryConfig;
};

