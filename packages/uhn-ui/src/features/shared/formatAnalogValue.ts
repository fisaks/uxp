/** Formats a numeric analog value with appropriate decimal precision. */
export function formatAnalogValue(value: unknown, decimalPrecision?: number): string {
    if (typeof value !== "number") return String(value);
    const precision = decimalPrecision ?? (Number.isInteger(value) ? 0 : 1);
    return value.toFixed(precision);
}
