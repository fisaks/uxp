// electricity-price.service.ts — Fetches and caches Finnish spot electricity prices.
//
// Uses the Porssisähkö v2 API (15-min intervals, snt/kWh incl. VAT). The API
// returns the latest 48h: today plus tomorrow once tomorrow has been published
// (~14:00 Finnish time). Fetches on startup, then a single timer drives all
// further fetches: planNextFetch() decides when from the cached prices alone,
// so there is no stored "next day available" state that can go stale.
// Publishes the price snapshot to MQTT and emits events for dispatchers to
// forward to WebSocket clients and rule runtimes.

import { ElectricityPriceEntry, ElectricityPriceSnapshot } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { DateTime } from "luxon";
import mqttService from "./mqtt.service";

const LOG_TAG = "[ElectricityPriceService]";
const API_URL = "https://api.porssisahko.net/v2/latest-prices.json";
const MQTT_TOPIC = "uhn/master/electricity/prices";

const TZ = "Europe/Helsinki";
const POLL_WINDOW_START = { hour: 13, minute: 30 }; // Finnish time
const POLL_WINDOW_END = { hour: 16, minute: 0 };    // Finnish time
const RETRY_INTERVAL_MS = 5 * 60_000;

export type ElectricityPriceEventMap = {
    pricesUpdated: [snapshot: ElectricityPriceSnapshot];
};

/** True when prices exist for the Finnish calendar day after `now`. */
function hasNextDayPrices(prices: ElectricityPriceEntry[], now: DateTime): boolean {
    const tomorrowStartMs = now.setZone(TZ).plus({ days: 1 }).startOf("day").toMillis();
    return prices.some((p) => new Date(p.startDate).getTime() >= tomorrowStartMs);
}

/**
 * Decides when to fetch next, from the cached prices and the current time only:
 * - nothing covers "now" (empty cache / failed fetches): retry shortly
 * - tomorrow's prices missing: poll every few minutes inside the daily window,
 *   otherwise wait for the next window start
 * - tomorrow's prices present: wait for tomorrow's window
 */
function planNextFetch(now: DateTime, prices: ElectricityPriceEntry[]): DateTime {
    const local = now.setZone(TZ);
    const nowMs = local.toMillis();
    const retryAt = local.plus({ milliseconds: RETRY_INTERVAL_MS });

    if (!prices.some((p) => new Date(p.endDate).getTime() > nowMs)) return retryAt;

    const windowStart = local.set({ ...POLL_WINDOW_START, second: 0, millisecond: 0 });
    const windowEnd = local.set({ ...POLL_WINDOW_END, second: 0, millisecond: 0 });
    const tomorrowWindowStart = windowStart.plus({ days: 1 });

    if (hasNextDayPrices(prices, local)) return tomorrowWindowStart;
    if (local < windowStart) return windowStart;
    if (local < windowEnd) return retryAt;
    return tomorrowWindowStart;
}

export class ElectricityPriceService extends EventEmitter<ElectricityPriceEventMap> {
    private snapshot: ElectricityPriceSnapshot = { prices: [], fetchedAt: "" };
    private timer: NodeJS.Timeout | undefined;
    private inFlight: Promise<void> | undefined;

    getSnapshot(): ElectricityPriceSnapshot {
        return this.snapshot;
    }

    /** Start the service: fetch immediately, then keep fetching as planned. */
    async start(): Promise<void> {
        await this.fetchPrices();
        this.scheduleNextFetch();
    }

    /** Manually trigger a refresh (e.g. from UI refresh button). */
    async refresh(): Promise<ElectricityPriceSnapshot> {
        await this.fetchPrices();
        this.scheduleNextFetch();
        return this.snapshot;
    }

    private scheduleNextFetch(): void {
        if (this.timer) clearTimeout(this.timer);

        const now = DateTime.now();
        const next = planNextFetch(now, this.snapshot.prices);
        const delayMs = Math.max(next.toMillis() - now.toMillis(), 0);
        AppLogger.debug({ message: `${LOG_TAG} Next fetch at ${next.toISO()}` });

        this.timer = setTimeout(async () => {
            await this.fetchPrices();
            this.scheduleNextFetch();
        }, delayMs);
    }

    // ── Fetching ────────────────────────────────────────────────────────

    /** Concurrent callers (poll timer, manual refresh) share one in-flight request. */
    private fetchPrices(): Promise<void> {
        this.inFlight ??= this.doFetch().finally(() => {
            this.inFlight = undefined;
        });
        return this.inFlight;
    }

    private async doFetch(): Promise<void> {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                AppLogger.warn({ message: `${LOG_TAG} API returned ${response.status}` });
                return;
            }
            const data = (await response.json()) as { prices: ElectricityPriceEntry[] };
            const prices = data.prices.sort(
                (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
            );

            this.snapshot = { prices, fetchedAt: new Date().toISOString() };

            AppLogger.info({
                message: `${LOG_TAG} Fetched ${prices.length} price entries, nextDay=${hasNextDayPrices(prices, DateTime.now())}`,
            });

            this.publishToMqtt();
            this.emit("pricesUpdated", this.snapshot);
        } catch (error) {
            AppLogger.error({ message: `${LOG_TAG} Failed to fetch prices`, error });
        }
    }

    private publishToMqtt(): void {
        mqttService.publish(MQTT_TOPIC, JSON.stringify(this.snapshot), { qos: 1, retain: true });
    }
}

export const electricityPriceService = new ElectricityPriceService();
