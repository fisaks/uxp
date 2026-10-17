/** The last known availability of a device and when it last changed (epoch ms). */
export type StoredAvailability = {
    available: boolean;
    changedAt: number;
};

/**
 * What a reported availability means for the stored one. The same status keeps the stored time (a status that is
 * re-delivered after a restart is not a change); a different status, or none stored yet, starts at `now`.
 */
export function nextAvailability(
    stored: StoredAvailability | undefined,
    available: boolean,
    now: number,
): { entry: StoredAvailability; changed: boolean } {
    if (stored && stored.available === available) return { entry: stored, changed: false };
    return { entry: { available, changedAt: now }, changed: true };
}
