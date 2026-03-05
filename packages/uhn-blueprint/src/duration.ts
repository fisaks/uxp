/** Duration helpers — convert human-readable units to milliseconds. */

export function seconds(n: number): number {
    return n * 1_000;
}

export function minutes(n: number): number {
    return n * 60_000;
}

export function hours(n: number): number {
    return n * 3_600_000;
}

/**
 * Combine hours, minutes, and seconds into milliseconds.
 * @example duration({ h: 1, m: 30 })       // 5_400_000
 * @example duration({ m: 2, s: 30 })       // 150_000
 * @example duration({ h: 1, m: 15, s: 45 }) // 4_545_000
 */
export function duration(parts: { h?: number; m?: number; s?: number }): number {
    return (parts.h ?? 0) * 3_600_000
         + (parts.m ?? 0) * 60_000
         + (parts.s ?? 0) * 1_000;
}
