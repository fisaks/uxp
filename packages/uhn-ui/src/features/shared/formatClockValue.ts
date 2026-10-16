import { TZ } from "../electricity/priceFormat";

const clockFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** A time in epoch milliseconds as Helsinki wall-clock time, e.g. "22:00". 0, a missing or an invalid value gives "—". */
export function formatClockValue(value: unknown): string {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "—";
    return clockFormat.format(new Date(value));
}
