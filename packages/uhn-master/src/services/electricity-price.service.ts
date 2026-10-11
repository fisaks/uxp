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
/** Retry interval after the daily window has closed without tomorrow's prices (late publication). */
const LATE_RETRY_INTERVAL_MS = 30 * 60_000;
/** How often the wall clock is compared with the planned fetch time (see scheduleNextFetch). */
const HEARTBEAT_MS = 30_000;

export type ElectricityPriceEventMap = {
    pricesUpdated: [snapshot: ElectricityPriceSnapshot];
};

/** Slots a day needs to count as published: more than half of its 96 (see hasNextDayPrices). */
const MIN_DAY_SLOTS = 48;

/**
 * True when prices exist for the Finnish calendar day after `now`.
 *
 * The market publishes one delivery day at a time, and that day follows Central European Time: it runs
 * 01:00–01:00 Finnish time. The Finnish day's first hour (00:00–00:59) therefore belongs to the previous
 * market day, so before tomorrow's prices are published (~14:00) the data still reaches into tomorrow's
 * first hour (4 slots). Requiring more than half a day tells the published day from that sliver.
 */
function hasNextDayPrices(prices: ElectricityPriceEntry[], now: DateTime): boolean {
    const tomorrowStart = now.setZone(TZ).plus({ days: 1 }).startOf("day");
    const fromMs = tomorrowStart.toMillis();
    const toMs = tomorrowStart.plus({ days: 1 }).toMillis();
    const slots = prices.filter((p) => {
        const start = new Date(p.startDate).getTime();
        return start >= fromMs && start < toMs;
    });
    return slots.length >= MIN_DAY_SLOTS;
}

/**
 * Decides when to fetch next, from the cached prices and the current time only:
 * - nothing covers "now" (empty cache / failed fetches): retry shortly
 * - tomorrow's prices missing: poll every few minutes inside the daily window, every half hour after it
 *   has closed (late publication), and wait for the window start before it opens
 * - tomorrow's prices present: wait for tomorrow's window
 */
function planNextFetch(now: DateTime, prices: ElectricityPriceEntry[]): DateTime {
    const local = now.setZone(TZ);
    const nowMs = local.toMillis();
    const retryAt = local.plus({ milliseconds: RETRY_INTERVAL_MS });

    // Cache is empty or every price lies in the past (failed fetches, long outage): try again shortly
    if (!prices.some((p) => new Date(p.endDate).getTime() > nowMs)) return retryAt;

    const windowStart = local.set({ ...POLL_WINDOW_START, second: 0, millisecond: 0 }); // today 13:30
    const windowEnd = local.set({ ...POLL_WINDOW_END, second: 0, millisecond: 0 });     // today 16:00
    const tomorrowWindowStart = windowStart.plus({ days: 1 });                          // tomorrow 13:30

    // Tomorrow's prices are already here: nothing new until tomorrow's publication window opens
    if (hasNextDayPrices(prices, local)) return tomorrowWindowStart;
    // Tomorrow's prices are missing and today's window hasn't opened yet: wait for it
    if (local < windowStart) return windowStart;
    // Inside today's window and still missing: poll again every few minutes until they appear
    if (local < windowEnd) return retryAt;
    // Today's window closed without tomorrow's prices (published late): keep trying, less often, until they appear
    return local.plus({ milliseconds: LATE_RETRY_INTERVAL_MS });
}

export class ElectricityPriceService extends EventEmitter<ElectricityPriceEventMap> {
    private snapshot: ElectricityPriceSnapshot = { prices: [], fetchedAt: "" };
    private heartbeat: NodeJS.Timeout | undefined;
    /** Wall-clock time (epoch ms) of the next planned fetch. */
    private nextFetchAt = Infinity;
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

    /**
     * Plans the next fetch and makes sure the heartbeat is running. The heartbeat compares the wall clock with
     * the planned time instead of using one long timeout: Node timers do not count time the machine is
     * suspended, so a long timeout would fire hours late after a suspend and leave stale prices.
     */
    private scheduleNextFetch(): void {
        const next = planNextFetch(DateTime.now(), this.snapshot.prices);
        this.nextFetchAt = next.toMillis();
        AppLogger.debug({ message: `${LOG_TAG} Next fetch at ${next.toISO()}` });

        this.heartbeat ??= setInterval(() => {
            if (Date.now() < this.nextFetchAt) return;
            this.nextFetchAt = Infinity; // no second fetch while this one is running
            this.fetchPrices().finally(() => this.scheduleNextFetch());
        }, HEARTBEAT_MS);
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
