// runtime-electricity.service.ts — Holds the latest electricity price snapshot.
//
// Prices arrive from the host (master/edge) as `electricityPriceUpdate` IPC commands. This service only stores them
// and answers lookups; when rules with price triggers are evaluated is decided in rule-runtime.ts (see
// onFirstSnapshot and startPriceSlotClock).

import type { ElectricityPriceSnapshot } from "@uhn/common";
import { runtimeOutput } from "../io/runtime-output";

export const SLOT_MS = 15 * 60_000;
const HOUR_MS = 60 * 60_000;

export function slotStartOf(ms: number): number {
    return Math.floor(ms / SLOT_MS) * SLOT_MS;
}

export class RuntimeElectricityService {
    /** slot start (epoch ms) → price (snt/kWh incl. VAT) */
    private slots = new Map<number, number>();
    private fetchedAt: Date | undefined;
    private firstSnapshotReceived = false;
    private firstSnapshotCallback: (() => void) | undefined;

    /** Start of the earliest and latest known slot (epoch ms), or undefined without data. */
    knownRange(): { firstMs: number; lastMs: number } | undefined {
        if (this.slots.size === 0) return undefined;
        let firstMs = Infinity;
        let lastMs = -Infinity;
        for (const startMs of this.slots.keys()) {
            if (startMs < firstMs) firstMs = startMs;
            if (startMs > lastMs) lastMs = startMs;
        }
        return { firstMs, lastMs };
    }

    /** Price of the slot starting at `slotStartMs`. */
    priceForSlot(slotStartMs: number): number | undefined {
        return this.slots.get(slotStartMs);
    }

    getFetchedAt(): Date | undefined {
        return this.fetchedAt;
    }

    currentPrice(nowMs: number = Date.now()): number | undefined {
        return this.slots.get(slotStartOf(nowMs));
    }

    /** Average of the four slots of the current hour; undefined if any is unknown. */
    hourAverage(nowMs: number = Date.now()): number | undefined {
        const hourStart = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
        let sum = 0;
        for (let i = 0; i < HOUR_MS / SLOT_MS; i++) {
            const price = this.slots.get(hourStart + i * SLOT_MS);
            if (price === undefined) return undefined;
            sum += price;
        }
        return sum / (HOUR_MS / SLOT_MS);
    }

    /**
     * Runs `callback` once, when the first snapshot containing at least one valid slot has been received
     * (immediately if that has already happened).
     */
    onFirstSnapshot(callback: () => void): void {
        if (this.firstSnapshotReceived) {
            callback();
            return;
        }
        this.firstSnapshotCallback = callback;
    }

    /** Replace the stored prices with a new snapshot. */
    update(snapshot: ElectricityPriceSnapshot): void {
        const slots = new Map<number, number>();
        let skipped = 0;
        for (const entry of snapshot.prices ?? []) {
            const startMs = new Date(entry.startDate).getTime();
            if (Number.isNaN(startMs) || typeof entry.price !== "number") {
                skipped++;
                continue;
            }
            slots.set(slotStartOf(startMs), entry.price);
        }
        this.slots = slots;

        const fetched = new Date(snapshot.fetchedAt); // invalid date when missing or unparsable
        this.fetchedAt = Number.isNaN(fetched.getTime()) ? undefined : fetched;

        runtimeOutput.log({
            level: "info",
            component: "RuntimeElectricityService",
            message: `Electricity prices received: ${slots.size} slots, fetched ${snapshot.fetchedAt}`
                + (skipped > 0 ? ` (${skipped} invalid entries skipped)` : ""),
        });

        if (!this.firstSnapshotReceived && this.slots.size > 0) {
            this.firstSnapshotReceived = true;
            this.firstSnapshotCallback?.();
        }
    }
}

/**
 * Calls `onSlotBoundary` 50 ms after every 15-minute price slot boundary (:00, :15, :30, :45) for the rest of
 * the runtime's life. Each call means a new price slot has started.
 */
export function startPriceSlotClock(onSlotBoundary: () => void): void {
    const scheduleNextBoundary = () => {
        const msUntilNextBoundary = SLOT_MS - (Date.now() % SLOT_MS);
        setTimeout(() => {
            onSlotBoundary();
            scheduleNextBoundary();
        }, msUntilNextBoundary + 50);
    };
    scheduleNextBoundary();
}
