export type ResourceType = "digitalInput" | "digitalOutput";
export type ResourceBase<TType extends ResourceType> = {
    id?: string;
    name?: string;
    description?: string;
    type: TType;
    edge: string;
    device?: number | string;
    pin?: number;
};
export type InputType = "toggle" | "push";
// Digital Input Resource (generic)
export type DigitalInputResourceBase<
    TInputKind extends string = string,
    TEdge extends string = string,
    TDevice extends string | number = string | number,
    TPin extends number = number
> = ResourceBase<"digitalInput"> & {
    edge: TEdge;
    device: TDevice;
    pin: TPin;
    inputKind: TInputKind;
    inputType: InputType;
};

// Digital Output Resource (generic)
export type DigitalOutputResourceBase<
    TOutputKind extends string = string,
    TEdge extends string = string,
    TDevice extends string | number = string | number,
    TPin extends number = number
> = ResourceBase<"digitalOutput"> & {
    edge: TEdge;
    device: TDevice;
    pin: TPin;
    outputKind: TOutputKind;
};


