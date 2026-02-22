// Resource Types and Bases
// resource.ts
export type ResourceType = "digitalInput" | "digitalOutput" | "timer";
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


export type TimerResourceBase<TEdge extends string = string> = ResourceBase<"timer"> & {
    edge: TEdge;
};

