import { AnalogStateValue, DigitalStateValue, TimerStateValue } from "@uhn/blueprint";

export function isDigitalValue(v: unknown): v is DigitalStateValue {
    return typeof v === "object" && v !== null && typeof (v as any).value === "boolean";
}

export function isAnalogValue(v: unknown): v is AnalogStateValue {
    return typeof v === "object" && v !== null && typeof (v as any).value === "number";
}

export function isTimerValue(v: unknown): v is TimerStateValue {
    return typeof v === "object" && v !== null && typeof (v as any).value === "boolean";
}