// electricity.ts — Types for electricity spot price queries available to rules as `ctx.electricity`.
//
// Prices are the Finnish spot price incl. VAT in snt/kWh, in 15-minute slots.
// All times are interpreted in Europe/Helsinki.

/** One 15-minute price slot. `end` is exclusive (start of the next slot). */
export type PriceSlot = {
    start: Date;
    end: Date;
    /** snt/kWh incl. VAT */
    price: number;
};

/**
 * A period of time to query. A slot belongs to a window if its start lies in [from, to).
 *
 * - `"today"` / `"tomorrow"`: Helsinki calendar days
 * - `{ next }`: duration in ms (e.g. `hours(2)`) starting at the beginning of the current slot
 * - `{ between: ["22:00", "07:00"] }`: daily "HH:mm" range in Helsinki time. Resolves to the occurrence
 *   containing now, otherwise the next one. An end earlier than the start means it crosses midnight.
 * - `{ from, to }`: explicit time range
 */
export type PriceWindow =
    | "today"
    | "tomorrow"
    | { next: number }
    | { between: [string, string] }
    | { from: Date; to: Date };

/** An unbroken run of consecutive slots. `end` is exclusive. */
export type PriceBlock = {
    start: Date;
    end: Date;
    /** Average price of the block's slots (snt/kWh incl. VAT). */
    average: number;
    slots: PriceSlot[];
};

export type BlockOptions = {
    /** Only consider blocks starting on the hour (e.g. 14:00–15:00, not 14:15–15:15). Default: false. */
    alignToHour?: boolean;
};

export type SelectionOptions = {
    /** Require the selected slots to be one unbroken block. Default: false. */
    consecutive?: boolean;
};

/**
 * Electricity price queries for rules.
 *
 * Missing data: aggregates (`average`, `min`, `max`, `rank`) return `undefined` unless every slot
 * of the window is known. `isAmong*` return `false` and `cheapest`/`mostExpensive` return `[]` when the
 * window is not fully known. Use `hasPrices(window)` to check and fall back.
 */
export type ElectricityQueries = {
    /** Price of the current slot. */
    currentPrice(): number | undefined;
    /** Price of the slot containing `time`. */
    priceAt(time: Date): number | undefined;
    /** Known slots of the window, sorted by start. */
    prices(window: PriceWindow): PriceSlot[];
    /** Average price of the window. */
    average(window: PriceWindow): number | undefined;
    /** Cheapest slot of the window (earliest on ties). */
    min(window: PriceWindow): PriceSlot | undefined;
    /** Most expensive slot of the window (earliest on ties). */
    max(window: PriceWindow): PriceSlot | undefined;
    /**
     * Where the current price sits within the window: 0 = cheapest slot, 1 = most expensive.
     * `undefined` if the window is not fully known, has fewer than 2 slots, or does not contain the current slot.
     */
    rank(window: PriceWindow): number | undefined;
    /** Is the current slot among the cheapest slots adding up to `durationMs` (e.g. `hours(3)`, rounded up to whole 15-minute slots) in the window? */
    isAmongCheapest(durationMs: number, window: PriceWindow, opts?: SelectionOptions): boolean;
    /** Is the current slot among the most expensive slots adding up to `durationMs` in the window? */
    isAmongMostExpensive(durationMs: number, window: PriceWindow, opts?: SelectionOptions): boolean;
    /** The cheapest slots adding up to `durationMs` in the window, sorted by start. */
    cheapest(durationMs: number, window: PriceWindow, opts?: SelectionOptions): PriceSlot[];
    /** The most expensive slots adding up to `durationMs` in the window, sorted by start. */
    mostExpensive(durationMs: number, window: PriceWindow, opts?: SelectionOptions): PriceSlot[];
    /**
     * The cheapest unbroken block of `durationMs` (e.g. `hours(1)`, rounded up to whole 15-minute slots) in the window,
     * with its start, end and average. `undefined` if the window is not fully known or the block does not fit in it
     * (or no block starts on the hour with `alignToHour`). Earliest block on ties.
     */
    cheapestBlock(durationMs: number, window: PriceWindow, opts?: BlockOptions): PriceBlock | undefined;
    /** The most expensive unbroken block of `durationMs` in the window. See {@link cheapestBlock}. */
    mostExpensiveBlock(durationMs: number, window: PriceWindow, opts?: BlockOptions): PriceBlock | undefined;
    /** True when every slot of the window is known (and the window has at least one slot). */
    hasPrices(window: PriceWindow): boolean;
    /** When the price data was last fetched by the master. */
    lastUpdated(): Date | undefined;
};
