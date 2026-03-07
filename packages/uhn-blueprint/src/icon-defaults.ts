// Default icon mappings for resource types/kinds and view command types.
// Pure data — no React/MUI dependency.

import type { BlueprintIcon } from "./icon";
import type { BaseAnalogInputKind, BaseAnalogOutputKind, BaseInputKind, BaseOutputKind, LogicalResourceType } from "./resource";
import type { ViewCommandType } from "./view";

export const outputKindDefaultIcon: Record<BaseOutputKind, BlueprintIcon> = {
    light: "lighting:bulb",
    indicator: "lighting:indicator",
    socket: "power:socket",
    relay: "control:relay",
};

export const inputKindDefaultIcon: Record<BaseInputKind, BlueprintIcon> = {
    button: "control:button",
    pir: "sensor:pir",
    lightSensor: "sensor:dark",
};

export const analogInputKindDefaultIcon: Record<BaseAnalogInputKind, BlueprintIcon> = {
    temperature: "sensor:temperature",
    humidity: "sensor:humidity",
    power: "power:energy",
    current: "power:current",
};

export const analogOutputKindDefaultIcon: Record<BaseAnalogOutputKind, BlueprintIcon> = {
    dimmer: "control:dimmer",
    valve: "control:valve",
    pwm: "control:speed",
};

export const logicalTypeDefaultIcon: Record<LogicalResourceType, BlueprintIcon> = {
    timer: "control:timer",
    complex: "status:dashboard",
    virtualDigitalInput: "control:button",
    virtualAnalogOutput: "control:dimmer",
};

export const commandTypeDefaultIcon: Record<ViewCommandType, BlueprintIcon> = {
    tap: "control:button",
    toggle: "control:toggle",
    longPress: "control:button",
    setAnalog: "control:dimmer",
    clearTimer: "control:timer",
};
