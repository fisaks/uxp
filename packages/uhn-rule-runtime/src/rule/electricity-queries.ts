// electricity-queries.ts — `ctx.electricity` implementation: price queries over 15-minute slots.
//
// A slot belongs to a window if its start lies in [from, to). All calendar logic uses Europe/Helsinki.

import type { BlockOptions, ElectricityQueries, PriceBlock, PriceSlot, PriceWindow, SelectionOptions } from "@uhn/blueprint";
import { parseClockTime } from "@uhn/blueprint";
import { DateTime } from "luxon";
import { SLOT_MS, slotStartOf, type RuntimeElectricityService } from "../services/runtime-electricity.service";

const TZ = "Europe/Helsinki";

type Range = { fromMs: number; toMs: number };

function dayRange(nowMs: number, dayOffset: number): Range {
    const start = DateTime.fromMillis(nowMs, { zone: TZ }).startOf("day").plus({ days: dayOffset });
    return { fromMs: start.toMillis(), toMs: start.plus({ days: 1 }).toMillis() };
}

/** The daily "HH:mm"–"HH:mm" occurrence containing now, otherwise the next one. */
function betweenRange(nowMs: number, between: [string, string]): Range {
    const a = parseClockTime(between[0]);
    const b = parseClockTime(between[1]);
    const today = DateTime.fromMillis(nowMs, { zone: TZ }).startOf("day");

    const occurrence = (dayOffset: number): Range => {
        const start = today.plus({ days: dayOffset }).set({ hour: a.hour, minute: a.minute });
        let end = start.set({ hour: b.hour, minute: b.minute });
        if (end <= start) end = end.plus({ days: 1 });
        return { fromMs: start.toMillis(), toMs: end.toMillis() };
    };

    for (const offset of [-1, 0]) {
        const r = occurrence(offset);
        if (nowMs >= r.fromMs && nowMs < r.toMs) return r;
    }
    const todays = occurrence(0);
    return todays.fromMs > nowMs ? todays : occurrence(1);
}

function resolveWindow(window: PriceWindow, nowMs: number): Range {
    if (window === "today") return dayRange(nowMs, 0);
    if (window === "tomorrow") return dayRange(nowMs, 1);
    if ("next" in window) {
        const fromMs = slotStartOf(nowMs);
        return { fromMs, toMs: fromMs + window.next };
    }
    if ("between" in window) return betweenRange(nowMs, window.between);
    return { fromMs: window.from.getTime(), toMs: window.to.getTime() };
}

function toSlot(startMs: number, price: number): PriceSlot {
    return { start: new Date(startMs), end: new Date(startMs + SLOT_MS), price };
}

export function createElectricityQueries(data: RuntimeElectricityService): ElectricityQueries {
    /** Known slots of the window, clamped to the range of cached data so a huge explicit window stays cheap. */
    const knownSlots = (window: PriceWindow): PriceSlot[] => {
        const range = data.knownRange();
        if (!range) return [];
        const { fromMs, toMs } = resolveWindow(window, Date.now());
        const out: PriceSlot[] = [];
        const first = Math.max(Math.ceil(fromMs / SLOT_MS) * SLOT_MS, range.firstMs);
        for (let s = first; s < toMs && s <= range.lastMs; s += SLOT_MS) {
            const price = data.priceForSlot(s);
            if (price !== undefined) out.push(toSlot(s, price));
        }
        return out;
    };

    /** All slots of the window, or undefined unless the window is non-empty and fully known. Stops at the first gap. */
    const fullSlots = (window: PriceWindow): PriceSlot[] | undefined => {
        const { fromMs, toMs } = resolveWindow(window, Date.now());
        const out: PriceSlot[] = [];
        for (let s = Math.ceil(fromMs / SLOT_MS) * SLOT_MS; s < toMs; s += SLOT_MS) {
            const price = data.priceForSlot(s);
            if (price === undefined) return undefined;
            out.push(toSlot(s, price));
        }
        return out.length > 0 ? out : undefined;
    };

    /** Index of the cheapest/most expensive block of `n` consecutive slots (earliest on ties), or -1. */
    const bestBlockStart = (slots: PriceSlot[], n: number, mode: "cheapest" | "mostExpensive", alignToHour: boolean): number => {
        const better = (a: number, b: number) => (mode === "cheapest" ? a < b : a > b);
        let sum = 0;
        for (let i = 0; i < n; i++) sum += slots[i].price;
        let best = -1;
        let bestSum = 0;
        for (let i = 0; i + n <= slots.length; i++) {
            if (i > 0) sum += slots[i + n - 1].price - slots[i - 1].price;
            if (alignToHour && slots[i].start.getUTCMinutes() !== 0) continue; // Finnish offsets are whole hours
            if (best === -1 || better(sum, bestSum)) {
                best = i;
                bestSum = sum;
            }
        }
        return best;
    };

    const block = (
        durationMs: number,
        window: PriceWindow,
        opts: BlockOptions | undefined,
        mode: "cheapest" | "mostExpensive",
    ): PriceBlock | undefined => {
        const slots = fullSlots(window);
        const n = Math.ceil(durationMs / SLOT_MS);
        if (!slots || n <= 0 || n > slots.length) return undefined;
        const start = bestBlockStart(slots, n, mode, opts?.alignToHour === true);
        if (start === -1) return undefined;
        const blockSlots = slots.slice(start, start + n);
        return {
            start: blockSlots[0].start,
            end: blockSlots[n - 1].end,
            average: blockSlots.reduce((sum, s) => sum + s.price, 0) / n,
            slots: blockSlots,
        };
    };

    const select = (
        durationMs: number,
        window: PriceWindow,
        opts: SelectionOptions | undefined,
        mode: "cheapest" | "mostExpensive",
    ): PriceSlot[] => {
        const slots = fullSlots(window);
        if (!slots) return [];
        const n = Math.ceil(durationMs / SLOT_MS);
        if (n <= 0) return [];
        if (n >= slots.length) return slots;

        if (opts?.consecutive) {
            const start = bestBlockStart(slots, n, mode, false);
            return slots.slice(start, start + n);
        }

        const sorted = [...slots].sort((a, b) =>
            (mode === "cheapest" ? a.price - b.price : b.price - a.price) || a.start.getTime() - b.start.getTime());
        return sorted.slice(0, n).sort((a, b) => a.start.getTime() - b.start.getTime());
    };

    const isAmong = (
        durationMs: number,
        window: PriceWindow,
        opts: SelectionOptions | undefined,
        mode: "cheapest" | "mostExpensive",
    ): boolean => {
        const currentStart = slotStartOf(Date.now());
        return select(durationMs, window, opts, mode).some((s) => s.start.getTime() === currentStart);
    };

    const extreme = (window: PriceWindow, mode: "min" | "max"): PriceSlot | undefined => {
        const slots = fullSlots(window);
        if (!slots) return undefined;
        let best = slots[0];
        for (const s of slots) {
            if (mode === "min" ? s.price < best.price : s.price > best.price) best = s;
        }
        return best;
    };

    return {
        currentPrice: () => data.currentPrice(),
        priceAt: (time) => data.priceForSlot(slotStartOf(time.getTime())),
        prices: (window) => knownSlots(window),
        average: (window) => {
            const slots = fullSlots(window);
            return slots ? slots.reduce((sum, s) => sum + s.price, 0) / slots.length : undefined;
        },
        min: (window) => extreme(window, "min"),
        max: (window) => extreme(window, "max"),
        rank: (window) => {
            const slots = fullSlots(window);
            const current = data.currentPrice();
            if (!slots || slots.length < 2 || current === undefined) return undefined;
            const currentStart = slotStartOf(Date.now());
            if (!slots.some((s) => s.start.getTime() === currentStart)) return undefined;
            return slots.filter((s) => s.price < current).length / (slots.length - 1);
        },
        isAmongCheapest: (durationMs, window, opts) => isAmong(durationMs, window, opts, "cheapest"),
        isAmongMostExpensive: (durationMs, window, opts) => isAmong(durationMs, window, opts, "mostExpensive"),
        cheapest: (durationMs, window, opts) => select(durationMs, window, opts, "cheapest"),
        mostExpensive: (durationMs, window, opts) => select(durationMs, window, opts, "mostExpensive"),
        cheapestBlock: (durationMs, window, opts) => block(durationMs, window, opts, "cheapest"),
        mostExpensiveBlock: (durationMs, window, opts) => block(durationMs, window, opts, "mostExpensive"),
        hasPrices: (window) => fullSlots(window) !== undefined,
        lastUpdated: () => data.getFetchedAt(),
    };
}
