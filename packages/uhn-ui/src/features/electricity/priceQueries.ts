import { ElectricityPriceEntry } from "@uhn/common";
import { TZ } from "./priceFormat";

// Spoken/shown answers to electricity price questions (voice and command palette).

export type ElectricityPriceQuery =
    | "current"
    | "hour"
    | "next-hour"
    | "today-average"
    | "tomorrow-average"
    | "today-cheapest"
    | "today-most-expensive";

const HOUR_MS = 3_600_000;
const NOT_AVAILABLE = "Electricity prices are not available.";

const dayFormat = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** Helsinki calendar day of a time as "YYYY-MM-DD" (built from parts, so it does not depend on locale formatting). */
function dayKey(ms: number): string {
    const parts = Object.fromEntries(dayFormat.formatToParts(ms).map((p) => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
}

/** The calendar day after a "YYYY-MM-DD" key. Date.UTC rolls an out-of-range day over (Oct 32 is Nov 1, Dec 32 is Jan 1 of the next year),
 *  and working on the date alone, not on hours, keeps it correct on the 23 and 25 hour clock-change days. */
function nextDayKey(key: string): string {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

const startMs = (entry: ElectricityPriceEntry) => new Date(entry.startDate).getTime();

const average = (entries: ElectricityPriceEntry[]) => entries.reduce((sum, e) => sum + e.price, 0) / entries.length;

const spokenPrice = (price: number) => `${Number(price.toFixed(2))} cents per kilowatt hour`;

/** Helsinki wall-clock time such as "14:00" (reads naturally in speech, unlike "14.00"). */
const clockTime = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

/** Clock hours are whole hours in Helsinki (whole-hour UTC offset), so they line up with UTC hours. */
const entriesInHour = (prices: ElectricityPriceEntry[], hourStartMs: number) =>
    prices.filter((p) => startMs(p) >= hourStartMs && startMs(p) < hourStartMs + HOUR_MS);

function averageAnswer(prefix: string, entries: ElectricityPriceEntry[]): string {
    return entries.length > 0 ? `${prefix} ${spokenPrice(average(entries))}.` : NOT_AVAILABLE;
}

/** The clock hour with the lowest or highest average price among the given entries. */
function extremeHour(entries: ElectricityPriceEntry[], pick: "lowest" | "highest"): { startMs: number; price: number } | undefined {
    const byHour = new Map<number, ElectricityPriceEntry[]>();
    for (const entry of entries) {
        const hour = Math.floor(startMs(entry) / HOUR_MS) * HOUR_MS;
        byHour.set(hour, [...(byHour.get(hour) ?? []), entry]);
    }
    let best: { startMs: number; price: number } | undefined;
    for (const [hourStart, hourEntries] of byHour) {
        const price = average(hourEntries);
        if (!best || (pick === "lowest" ? price < best.price : price > best.price)) best = { startMs: hourStart, price };
    }
    return best;
}

function extremeHourAnswer(label: string, entries: ElectricityPriceEntry[], pick: "lowest" | "highest"): string {
    const hour = extremeHour(entries, pick);
    if (!hour) return NOT_AVAILABLE;
    return `${label} is ${clockTime(hour.startMs)} to ${clockTime(hour.startMs + HOUR_MS)} at ${spokenPrice(hour.price)}.`;
}

/** The sentence answering `query` from the price list at time `nowMs`. */
export function answerElectricityPriceQuery(query: ElectricityPriceQuery, prices: ElectricityPriceEntry[], nowMs: number): string {
    const hourStartMs = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
    const todayKey = dayKey(nowMs);
    const today = () => prices.filter((p) => dayKey(startMs(p)) === todayKey);

    switch (query) {
        case "current": {
            const slot = prices.find((p) => startMs(p) <= nowMs && nowMs < new Date(p.endDate).getTime());
            return slot ? `The electricity price is ${spokenPrice(slot.price)}.` : NOT_AVAILABLE;
        }
        case "hour":
            return averageAnswer("The electricity price this hour is", entriesInHour(prices, hourStartMs));
        case "next-hour":
            return averageAnswer("The electricity price next hour is", entriesInHour(prices, hourStartMs + HOUR_MS));
        case "today-average":
            return averageAnswer("The average electricity price today is", today());
        case "tomorrow-average": {
            const tomorrowKey = nextDayKey(todayKey);
            const tomorrow = prices.filter((p) => dayKey(startMs(p)) === tomorrowKey);
            return tomorrow.length > 0
                ? averageAnswer("The average electricity price tomorrow is", tomorrow)
                : "Tomorrow's electricity prices are not available yet.";
        }
        case "today-cheapest":
            return extremeHourAnswer("The cheapest hour today", today(), "lowest");
        case "today-most-expensive":
            return extremeHourAnswer("The most expensive hour today", today(), "highest");
    }
}
