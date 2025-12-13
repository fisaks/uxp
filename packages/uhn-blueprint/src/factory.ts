import { DigitalInputResourceBase, DigitalOutputResourceBase } from "./resource";

export function digitalInput<
    TInputKind extends string = string,
    TEdge extends string = string,
    TDevice extends string | number = string | number,
    TPin extends number = number
>(
    props: Omit<DigitalInputResourceBase<TInputKind, TEdge, TDevice, TPin>, "type">
): DigitalInputResourceBase<TInputKind, TEdge, TDevice, TPin> {
    return { ...props, type: "digitalInput" };
}

export function digitalOutput<
    TOutputKind extends string = string,
    TEdge extends string = string,
    TDevice extends string | number = string | number,
    TPin extends number = number
>(
    props: Omit<DigitalOutputResourceBase<TOutputKind, TEdge, TDevice, TPin>, "type">
): DigitalOutputResourceBase<TOutputKind, TEdge, TDevice, TPin> {
    return { ...props, type: "digitalOutput" };
}
