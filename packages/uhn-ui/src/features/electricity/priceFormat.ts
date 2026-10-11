// Shared helpers for showing electricity prices in the UI (the price page and the rule panel).

export const TZ = "Europe/Helsinki";

// Limits for colouring a price (snt/kWh incl. VAT).
export const CHEAP_THRESHOLD = 5;
export const EXPENSIVE_THRESHOLD = 15;

export const CHEAP_COLOR = "#4caf50";
export const NORMAL_COLOR = "#ff9800";
export const EXPENSIVE_COLOR = "#f44336";

export function getPriceColor(price: number): string {
    if (price <= CHEAP_THRESHOLD) return CHEAP_COLOR;
    if (price >= EXPENSIVE_THRESHOLD) return EXPENSIVE_COLOR;
    return NORMAL_COLOR;
}

/** Helsinki wall-clock time of an ISO date, e.g. "15.15". */
export function formatTime(isoDate: string): string {
    return new Date(isoDate).toLocaleTimeString("fi-FI", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}
