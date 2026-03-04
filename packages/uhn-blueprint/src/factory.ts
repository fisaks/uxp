// Factory Functions
// factory.ts
import { AnalogInputResourceBase, AnalogOutputResourceBase, ComplexResourceBase, DigitalInputResourceBase, DigitalOutputResourceBase, TimerResourceBase } from "./resource";

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

export function analogInput<
    TInputKind extends string = string,
    TEdge extends string = string,
    TDevice extends string | number = string | number,
    TPin extends number = number
>(
    props: Omit<AnalogInputResourceBase<TInputKind, TEdge, TDevice, TPin>, "type">
): AnalogInputResourceBase<TInputKind, TEdge, TDevice, TPin> {
    return { ...props, type: "analogInput" };
}

export function analogOutput<
    TOutputKind extends string = string,
    TEdge extends string = string,
    TDevice extends string | number = string | number,
    TPin extends number = number
>(
    props: Omit<AnalogOutputResourceBase<TOutputKind, TEdge, TDevice, TPin>, "type">
): AnalogOutputResourceBase<TOutputKind, TEdge, TDevice, TPin> {
    return { ...props, type: "analogOutput" };
}

export function timer<THost extends string = string>(
    props: Omit<TimerResourceBase<THost>, "type">
): TimerResourceBase<THost> {
    return { ...props, type: "timer" };
}

export function complex<THost extends string = string>(
    props: Omit<ComplexResourceBase<THost>, "type">
): ComplexResourceBase<THost> {
    return { ...props, type: "complex" };
}
