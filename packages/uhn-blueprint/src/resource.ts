// Resource Types and Bases
// resource.ts

export type PhysicalResourceType = "digitalInput" | "digitalOutput" | "analogInput" | "analogOutput";
export type LogicalResourceType = "timer" | "complex" | "virtualDigitalInput" | "virtualAnalogOutput";
export type ResourceType = PhysicalResourceType | LogicalResourceType;

export type ResourceBase<TType extends ResourceType> = {
    id?: string;
    name?: string;
    description?: string;
    type: TType;
    /** Hide this resource from the main grid. It remains accessible in complex resource popovers. */
    hidden?: boolean;
};

export type PhysicalResourceBase<
    TType extends PhysicalResourceType,
    TEdge extends string = string,
    TDevice extends string | number = string,
    TPin extends number = number
> = ResourceBase<TType> & {
    edge: TEdge;
    device: TDevice;
    pin: TPin;
};

export type LogicalResourceBase<
    TType extends LogicalResourceType,
    THost extends string = string
> = ResourceBase<TType> & {
    host: THost;
};

export function isPhysicalResourceType(type: ResourceType): type is PhysicalResourceType {
    return type === "digitalInput" || type === "digitalOutput" || type === "analogInput" || type === "analogOutput";
}

export function isLogicalResourceType(type: ResourceType): type is LogicalResourceType {
    return type === "timer" || type === "complex" || type === "virtualDigitalInput" || type === "virtualAnalogOutput";
}

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
> = PhysicalResourceBase<"digitalInput", TEdge, TDevice, TPin> & {
    inputKind: TInputKind; //defined by project like "button" | "pir" | "lightSensor" etc.
    inputType: InputType;//"toggle" | "push"
};

// Digital Output Resource (generic)
export type DigitalOutputResourceBase<
    TOutputKind extends OutputKind = OutputKind,
    TEdge extends string = string,
    TDevice extends string | number = string,
    TPin extends number = number
> = PhysicalResourceBase<"digitalOutput", TEdge, TDevice, TPin> & {
    outputKind: TOutputKind; //defined by project like "relay" | "socket" | "light" | "indicator" etc
};


// Analog Input Resource (generic)
export type AnalogInputResourceBase<
    TInputKind extends AnalogInputKind = AnalogInputKind,
    TEdge extends string = string,
    TDevice extends string | number = string,
    TPin extends number = number
> = PhysicalResourceBase<"analogInput", TEdge, TDevice, TPin> & {
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
> = PhysicalResourceBase<"analogOutput", TEdge, TDevice, TPin> & {
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

export type ComplexResourceBase<THost extends string = string> = LogicalResourceBase<"complex", THost> & {
    /** Compute function that derives this resource's state from dependency values */
    computeFn: ComplexComputeFn;
    /** Resources whose state values are passed to computeFn (can differ from subResources) */
    computeResources: ResourceBase<ResourceType>[];
    /** Unit label for display (e.g. "W", "%") */
    unit?: string;
    /** The numeric value that represents the inactive/off state. Active when computed value !== inactiveValue. Default: 0 */
    inactiveValue?: number;
    /** When true, short clicks send a tap command (for rule triggers). When false, all clicks open the popover. Default: false */
    emitsTap?: boolean;
    /** Ordered list of sub-resource references (for UI popover) */
    subResources: ComplexSubResourceRef[];
};
