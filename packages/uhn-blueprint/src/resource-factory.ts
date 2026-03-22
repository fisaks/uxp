// Resource Factory Functions
// resource-factory.ts
import { analogInputKindDefaultIcon, analogOutputKindDefaultIcon, inputKindDefaultIcon, logicalTypeDefaultIcon, outputKindDefaultIcon } from "./icon-defaults";
import { AnalogInputResourceBase, AnalogOutputResourceBase, BaseAnalogInputKind, BaseAnalogOutputKind, BaseInputKind, BaseOutputKind, ComplexResourceBase, DigitalInputResourceBase, DigitalOutputResourceBase, TimerResourceBase, VirtualAnalogOutputResourceBase, VirtualDigitalInputResourceBase } from "./resource";

export function digitalInput<
    TInputKind extends string = string,
    TEdge extends string = string,
    TDevice extends string | number = string | number,
    TPin extends number | string = number | string
>(
    props: Omit<DigitalInputResourceBase<TInputKind, TEdge, TDevice, TPin>, "type">
): DigitalInputResourceBase<TInputKind, TEdge, TDevice, TPin> {
    const kindIcon = props.inputKind === "button" && props.inputType === "toggle"
        ? "control:toggle" as const
        : inputKindDefaultIcon[props.inputKind as BaseInputKind];
    return { ...props, type: "digitalInput", icon: props.icon ?? kindIcon ?? "status:device" };
}

export function digitalOutput<
    TOutputKind extends string = string,
    TEdge extends string = string,
    TDevice extends string | number = string | number,
    TPin extends number | string = number | string
>(
    props: Omit<DigitalOutputResourceBase<TOutputKind, TEdge, TDevice, TPin>, "type">
): DigitalOutputResourceBase<TOutputKind, TEdge, TDevice, TPin> {
    return { ...props, type: "digitalOutput", icon: props.icon ?? outputKindDefaultIcon[props.outputKind as BaseOutputKind] ?? "status:device" };
}

export function analogInput<
    TInputKind extends string = string,
    TEdge extends string = string,
    TDevice extends string | number = string | number,
    TPin extends number | string = number | string
>(
    props: Omit<AnalogInputResourceBase<TInputKind, TEdge, TDevice, TPin>, "type">
): AnalogInputResourceBase<TInputKind, TEdge, TDevice, TPin> {
    return { ...props, type: "analogInput", icon: props.icon ?? analogInputKindDefaultIcon[props.analogInputKind as BaseAnalogInputKind] ?? "status:device" };
}

export function analogOutput<
    TOutputKind extends string = string,
    TEdge extends string = string,
    TDevice extends string | number = string | number,
    TPin extends number | string = number | string
>(
    props: Omit<AnalogOutputResourceBase<TOutputKind, TEdge, TDevice, TPin>, "type">
): AnalogOutputResourceBase<TOutputKind, TEdge, TDevice, TPin> {
    return { ...props, type: "analogOutput", icon: props.icon ?? analogOutputKindDefaultIcon[props.analogOutputKind as BaseAnalogOutputKind] ?? "status:device" };
}

export function timer<THost extends string = string>(
    props: Omit<TimerResourceBase<THost>, "type">
): TimerResourceBase<THost> {
    return { ...props, type: "timer", icon: props.icon ?? logicalTypeDefaultIcon.timer };
}

export function complex<THost extends string = string>(
    props: Omit<ComplexResourceBase<THost>, "type">
): ComplexResourceBase<THost> {
    return { ...props, type: "complex", icon: props.icon ?? logicalTypeDefaultIcon.complex };
}

export function virtualDigitalInput<THost extends string = string>(
    props: Omit<VirtualDigitalInputResourceBase<THost>, "type">
): VirtualDigitalInputResourceBase<THost> {
    const kindIcon = props.inputType === "toggle" ? "control:toggle" as const : logicalTypeDefaultIcon.virtualDigitalInput;
    return { ...props, type: "virtualDigitalInput", icon: props.icon ?? kindIcon };
}

export function virtualAnalogOutput<THost extends string = string>(
    props: Omit<VirtualAnalogOutputResourceBase<THost>, "type">
): VirtualAnalogOutputResourceBase<THost> {
    return { ...props, type: "virtualAnalogOutput", icon: props.icon ?? logicalTypeDefaultIcon.virtualAnalogOutput };
}
