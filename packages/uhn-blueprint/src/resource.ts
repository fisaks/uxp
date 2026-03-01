// Resource Types and Bases
// resource.ts
export type ResourceType = "digitalInput" | "digitalOutput" | "analogInput" | "analogOutput" | "timer";
export type ResourceBase<TType extends ResourceType> = {
    id?: string;
    name?: string;
    description?: string;
    type: TType;
    edge: string;
    device?: string;
    pin?: number;
};
export type InputType = "toggle" | "push";
export type BaseInputKind = "button" | "pir" | "lightSensor";
export type BaseOutputKind = "relay" | "socket" | "light" | "indicator";
export type InputKind = BaseInputKind | (string & {});
export type OutputKind = BaseOutputKind | (string & {});

export type BaseAnalogInputKind = "temperature" | "humidity" | "power";
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

