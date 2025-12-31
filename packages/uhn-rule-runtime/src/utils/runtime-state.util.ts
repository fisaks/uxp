import { AnalogStateValue, DigitalStateValue, TimerStateValue } from "@uhn/blueprint";

export function isDigitalValue(v: unknown): v is DigitalStateValue {
    return v !== null && v !== undefined && typeof v === "boolean";
}

export function isAnalogValue(v: unknown): v is AnalogStateValue {
    return v !== null && v !== undefined && typeof v === "number";
}

export function isTimerValue(v: unknown): v is TimerStateValue {
    return isDigitalValue(v);
}