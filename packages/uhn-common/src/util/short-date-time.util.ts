/**
 * An epoch millisecond time as a short local date and time, e.g. "17.10. 10:45" (day.month. hh:mm, 24 hour clock).
 * Home automation runs on Finnish time, so the default zone is Helsinki.
 */
export function formatShortDateTime(epochMs: number, timeZone = "Europe/Helsinki"): string {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone, day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(epochMs));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("day")}.${get("month")}. ${get("hour")}:${get("minute")}`;
}
