// Mi-Light FUT069 RGB+CCT factory functions and constants.
// Reusable across blueprint projects — generic type parameters for edge/device.
// Pins are fixed per FUT069 model and assigned automatically by each factory.

import type { AnalogOutputResourceBase, DigitalInputResourceBase, DigitalOutputResourceBase } from "./resource";
import { analogOutput, digitalInput, digitalOutput } from "./resource-factory";

// ─── Pin Constants ──────────────────────────────────────────────────────────

/** FUT069 pin mapping (matches go-uhn driver) */
export const MilightPin = {
    Power: 0,
    NightMode: 1,
    WhiteMode: 2,
    SpeedUp: 3,
    SpeedDown: 4,
    Brightness: 5,
    ColorTemp: 6,
    Hue: 7,
    Saturation: 8,
    Mode: 9,
} as const;

// ─── Effect Mode Constants ──────────────────────────────────────────────────

/** FUT069 built-in effect modes (1-9) */
export const MilightEffect = {
    /** Different colors fade into each other */
    ColorFade: 1,
    /** White flashes */
    WhiteStrobe: 2,
    /** Red, green, blue, white fade in/out sequentially */
    RGBWFade: 3,
    /** Red, green, blue, white, yellow, purple flash */
    ColorFlash: 4,
    /** Different colors strobe and flash */
    Disco: 5,
    /** Red brightens 0→100%, shuts down, flashes 3x */
    RedRamp: 6,
    /** Green brightens 0→100%, shuts down, flashes 3x */
    GreenRamp: 7,
    /** Blue brightens 0→100%, shuts down, flashes 3x */
    BlueRamp: 8,
    /** Colors fade then flash randomly */
    ColorChangeFlash: 9,
} as const;

export type MilightEffectMode = typeof MilightEffect[keyof typeof MilightEffect];

// ─── Shared Props (pin omitted — assigned by each factory) ──────────────────

type MilightOutputProps<E extends string, D extends string | number> =
    Omit<DigitalOutputResourceBase<string, E, D, number>, "type" | "outputKind" | "pin">;

type MilightInputProps<E extends string, D extends string | number> =
    Omit<DigitalInputResourceBase<string, E, D, number>, "type" | "inputKind" | "inputType" | "pin">;

type MilightAnalogProps<E extends string, D extends string | number> =
    Omit<AnalogOutputResourceBase<string, E, D, number>, "type" | "analogOutputKind" | "pin">;

// ─── Digital Output Factories (power, night mode) ───────────────────────────

/** Mi-Light power on/off (pin 0) */
export function milightPower<E extends string, D extends string | number>(
    props: MilightOutputProps<E, D>,
) {
    return digitalOutput<"light", E, D, typeof MilightPin.Power>({
        ...props, pin: MilightPin.Power, outputKind: "light",
    });
}

/** Mi-Light night mode on/off (pin 1) — very dim warm light. Driver handles exit (power cycle). */
export function milightNightMode<E extends string, D extends string | number>(
    props: MilightOutputProps<E, D>,
) {
    return digitalOutput<"light", E, D, typeof MilightPin.NightMode>({
        icon: "scene:night", ...props, pin: MilightPin.NightMode, outputKind: "light",
    });
}

// ─── Digital Input Factories (push buttons) ─────────────────────────────────

/** Mi-Light white mode button (pin 2) — switches to CCT mode (RGB off) */
export function milightWhiteMode<E extends string, D extends string | number>(
    props: MilightInputProps<E, D>,
) {
    return digitalInput<"button", E, D, typeof MilightPin.WhiteMode>({
        icon: "weather:sun", ...props, pin: MilightPin.WhiteMode, inputKind: "button", inputType: "push",
    });
}

/** Mi-Light effect speed up button (pin 3) */
export function milightSpeedUp<E extends string, D extends string | number>(
    props: MilightInputProps<E, D>,
) {
    return digitalInput<"button", E, D, typeof MilightPin.SpeedUp>({
        icon: "control:speed", ...props, pin: MilightPin.SpeedUp, inputKind: "button", inputType: "push",
    });
}

/** Mi-Light effect speed down button (pin 4) */
export function milightSpeedDown<E extends string, D extends string | number>(
    props: MilightInputProps<E, D>,
) {
    return digitalInput<"button", E, D, typeof MilightPin.SpeedDown>({
        icon: "control:speed", ...props, pin: MilightPin.SpeedDown, inputKind: "button", inputType: "push",
    });
}

// ─── Analog Output Factories ────────────────────────────────────────────────

/** Mi-Light brightness 0-100% (pin 5) */
export function milightBrightness<E extends string, D extends string | number>(
    props: MilightAnalogProps<E, D>,
) {
    return analogOutput<"dimmer", E, D, typeof MilightPin.Brightness>({
        min: 0, max: 100, step: 1, unit: "%",
        icon: "color:brightness",
        ...props,
        pin: MilightPin.Brightness,
        analogOutputKind: "dimmer",
    });
}

/** Mi-Light color temperature 0=warm, 100=cool (pin 6) */
export function milightColorTemp<E extends string, D extends string | number>(
    props: MilightAnalogProps<E, D>,
) {
    return analogOutput<"colorTemp", E, D, typeof MilightPin.ColorTemp>({
        min: 0, max: 100, step: 1, unit: "%",
        icon: "color:temperature",
        ...props,
        pin: MilightPin.ColorTemp,
        analogOutputKind: "colorTemp",
    });
}

/** Mi-Light hue 0-255 — enters color mode (pin 7) */
export function milightHue<E extends string, D extends string | number>(
    props: MilightAnalogProps<E, D>,
) {
    return analogOutput<"hue", E, D, typeof MilightPin.Hue>({
        min: 0, max: 255, step: 1, unit: "",
        icon: "color:hue",
        ...props,
        pin: MilightPin.Hue,
        analogOutputKind: "hue",
    });
}

/** Mi-Light saturation 0=white, 100=vivid color (pin 8). Driver inverts for protocol. */
export function milightSaturation<E extends string, D extends string | number>(
    props: MilightAnalogProps<E, D>,
) {
    return analogOutput<"saturation", E, D, typeof MilightPin.Saturation>({
        min: 0, max: 100, step: 1, unit: "%",
        icon: "color:saturation",
        ...props,
        pin: MilightPin.Saturation,
        analogOutputKind: "saturation",
    });
}

/** Mi-Light effect mode 1-9 (pin 9). Use MilightEffect constants for values. */
export function milightMode<E extends string, D extends string | number>(
    props: MilightAnalogProps<E, D>,
) {
    return analogOutput<"mode", E, D, typeof MilightPin.Mode>({
        options: [
            { value: MilightEffect.ColorFade, label: "Color Fade" },
            { value: MilightEffect.WhiteStrobe, label: "White Strobe" },
            { value: MilightEffect.RGBWFade, label: "RGBW Fade" },
            { value: MilightEffect.ColorFlash, label: "Color Flash" },
            { value: MilightEffect.Disco, label: "Disco" },
            { value: MilightEffect.RedRamp, label: "Red Ramp" },
            { value: MilightEffect.GreenRamp, label: "Green Ramp" },
            { value: MilightEffect.BlueRamp, label: "Blue Ramp" },
            { value: MilightEffect.ColorChangeFlash, label: "Color Change Flash" },
        ],
        icon: "control:mode",
        ...props,
        pin: MilightPin.Mode,
        analogOutputKind: "mode",
    });
}
