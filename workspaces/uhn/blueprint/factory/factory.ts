import { digitalInput, DigitalInputResourceBase, digitalOutput, DigitalOutputResourceBase } from "@uhn/blueprint";

// Project-local strong literal unions
export type Edge = "edge1"
export type OutputDevice = 1 | 3 | 5;
export type InputDevice = 2 | 4 | 6;
export type Pin = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type InputKind = "button" | "pir" | "lightSensor";
export type OutputKind = "relay" | "socket" | "light" | "indicator";

// Strong resource types
export type DigitalInputProps = Omit<DigitalInputResourceBase<
    InputKind, Edge, InputDevice, Pin>, "type" | "inputKind" | "inputType">;
export type DigitalOutputProps = Omit<DigitalOutputResourceBase<
    OutputKind, Edge, OutputDevice, Pin>, "type" | "outputKind">;

// Project-local helpers (optional)
export function inputPir(props: DigitalInputProps) {
    return digitalInput<InputKind, Edge, InputDevice, Pin>({
        ...props,
        inputKind: "pir",
        inputType: "push",
    });
}
export function inputButtonPush(props: DigitalInputProps) {
    return digitalInput<InputKind, Edge, InputDevice, Pin>({
        ...props,
        inputKind: "button",
        inputType: "push",
    });
}
export function inputButtonToggle(props: DigitalInputProps) {
    return digitalInput<InputKind, Edge, InputDevice, Pin>({
        ...props,
        inputKind: "button",
        inputType: "toggle",
    });
}
export function inputLightSensor(props: DigitalInputProps) {
    return digitalInput<InputKind, Edge, InputDevice, Pin>({
        ...props,
        inputKind: "lightSensor",
        inputType: "toggle",
    });
}

export function outputSocket(props: DigitalOutputProps) {
    return digitalOutput<OutputKind, Edge, OutputDevice, Pin>({
        ...props,
        outputKind: "socket",
    });
}
export function outputLight(props: DigitalOutputProps) {
    return digitalOutput<OutputKind, Edge, OutputDevice, Pin>({
        ...props,
        outputKind: "light",
    });
}
export function outputIndicatorLight(props: DigitalOutputProps) {
    return digitalOutput<OutputKind, Edge, OutputDevice, Pin>({
        ...props,
        outputKind: "indicator",
    });
}

export function outputRelay(props: DigitalOutputProps) {
    return digitalOutput<OutputKind, Edge, OutputDevice, Pin>({
        ...props,
        outputKind: "relay",
    });
}