/**
 * Centralized date/time formatting.
 *
 * Currently hardcoded to Finnish locale (24h clock, dd.MM.yyyy).
 * TODO: Make configurable via UXP control panel settings.
 * - Locale (affects date order, separators)
 * - Clock format (12h / 24h)
 * - Date format (dd.MM.yyyy / yyyy-MM-dd / MM/dd/yyyy)
 */

const LOCALE = "fi-FI";

/** Format a date+time string. Example: "16.4.2026 19:30" */
export function formatDateTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString(LOCALE, {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

/** Format time only. Example: "19:30" */
export function formatTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString(LOCALE, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

/** Format date only. Example: "16.4.2026" */
export function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString(LOCALE, {
        day: "numeric",
        month: "numeric",
        year: "numeric",
    });
}
