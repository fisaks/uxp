import { DeviceAvailabilityEntry } from "@uhn/common";
import { AppLogger, runBackgroundTask } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { DateTime } from "luxon";
import { DeviceAvailabilityEntity } from "../db/entities/DeviceAvailabilityEntity";
import { DeviceAvailabilityRepository } from "../repositories/device-availability.repository";
import { nextAvailability, StoredAvailability } from "../util/availability-change.util";
import { parseMqttTopic } from "../util/mqtt-topic.util";
import { subscriptionService } from "./subscription.service";
const { AppDataSource } = require("../db/typeorm.config");

type AdapterInfo = { name: string; type: string };

type AdaptersPayload = { adapters: AdapterInfo[] };

function isAdapterInfo(obj: unknown): obj is AdapterInfo {
    return typeof obj === "object" && obj !== null
        && typeof (obj as AdapterInfo).name === "string"
        && typeof (obj as AdapterInfo).type === "string";
}

function isAdaptersPayload(obj: unknown): obj is AdaptersPayload {
    return typeof obj === "object" && obj !== null
        && Array.isArray((obj as AdaptersPayload).adapters)
        && (obj as AdaptersPayload).adapters.every(isAdapterInfo);
}

type DeviceAvailabilityEventMap = {
    availabilityChanged: [entry: DeviceAvailabilityEntry];
};

class DeviceAvailabilityServiceImpl extends EventEmitter<DeviceAvailabilityEventMap> {
    private cache = new Map<string, DeviceAvailabilityEntry>();
    // Last known availability and when it changed, kept in the database so it survives a restart: "edge:device" → record
    private stored = new Map<string, StoredAvailability>();
    // Availability messages arrive from MQTT as soon as the master connects, before the stored records are loaded
    private storedLoaded = false;
    private pendingMessages: Array<{ topic: string; payload: string | null }> = [];
    // Known infrastructure adapters per edge: "edge:adapterName" → type
    private adapters = new Map<string, string>();

    constructor() {
        super();
        this.init();
    }

    private init() {
        subscriptionService.on("deviceAvailability", (topic, payload) => {
            this.handleAvailabilityMessage(topic, payload);
        });

        subscriptionService.on("edgeAdapters", (topic, payload) => {
            this.handleAdaptersMessage(topic, payload);
        });
    }

    private handleAdaptersMessage(topic: string, payload: unknown) {
        const parsed = parseMqttTopic(topic);
        if (!parsed) return;

        const { edge } = parsed;
        if (!isAdaptersPayload(payload)) return;

        // Clear old adapters for this edge and replace
        for (const key of this.adapters.keys()) {
            if (key.startsWith(`${edge}:`)) {
                this.adapters.delete(key);
            }
        }

        for (const adapter of payload.adapters) {
            this.adapters.set(`${edge}:${adapter.name}`, adapter.type);
        }

        AppLogger.info({ message: `[DeviceAvailability] Adapters updated for edge '${edge}'`, object: { count: payload.adapters.length, adapters: payload.adapters.map(a => a.name) } });
    }

    /** Loads the stored availability records, then handles the availability messages that arrived in the meantime. */
    async start() {
        try {
            const rows = await runBackgroundTask(AppDataSource, () => DeviceAvailabilityRepository.findAll());
            for (const row of rows) {
                this.stored.set(`${row.edge}:${row.device}`, { available: row.available, changedAt: row.changedAt.toMillis() });
            }
            AppLogger.info({ message: `[DeviceAvailability] Loaded ${rows.length} stored availability record(s)` });
        } catch (error) {
            // Without the records every device simply gets the time it is first seen
            AppLogger.error({ message: `[DeviceAvailability] Failed to load stored availability records:`, error });
        }
        this.storedLoaded = true;
        for (const { topic, payload } of this.pendingMessages.splice(0)) {
            this.processAvailabilityMessage(topic, payload);
        }
    }

    private handleAvailabilityMessage(topic: string, payload: string | null) {
        if (!this.storedLoaded) {
            this.pendingMessages.push({ topic, payload });
            return;
        }
        this.processAvailabilityMessage(topic, payload);
    }

    private persist(edge: string, device: string, record: StoredAvailability) {
        runBackgroundTask(AppDataSource, () => DeviceAvailabilityRepository.save(
            new DeviceAvailabilityEntity({ edge, device, available: record.available, changedAt: DateTime.fromMillis(record.changedAt) }),
        )).catch((error) => {
            AppLogger.error({ message: `[DeviceAvailability] Failed to store availability of ${edge}:${device}:`, error });
        });
    }

    private processAvailabilityMessage(topic: string, payload: string | null) {
        // Topic: uhn/{edge}/device/{device}/availability
        const parsed = parseMqttTopic(topic, 5);
        if (!parsed) return;

        const { edge, segments } = parsed;
        const device = segments[3];

        // Payload is "online" or "offline" (plain text, normalized by the edge)
        if (payload === null) return;
        const available = payload.trim() === "online";

        const key = `${edge}:${device}`;
        // The same status as stored keeps the stored time, also after a restart of the master
        const { entry: record, changed } = nextAvailability(this.stored.get(key), available, Date.now());
        this.stored.set(key, record);
        if (changed) this.persist(edge, device, record);

        // Only emit on actual change (the first message after a start is announced even if it matches the stored one)
        const existing = this.cache.get(key);
        if (existing && existing.available === available) return;

        const entry: DeviceAvailabilityEntry = {
            edge,
            device,
            available,
            updatedAt: record.changedAt,
        };

        this.cache.set(key, entry);
        AppLogger.info({ message: `[DeviceAvailability] ${key} → ${available ? "online" : "offline"}` });
        this.emit("availabilityChanged", entry);
    }

    getSnapshot(): DeviceAvailabilityEntry[] {
        return Array.from(this.cache.values());
    }

    getDeviceAvailability(edge: string, device: string): boolean | undefined {
        return this.cache.get(`${edge}:${device}`)?.available;
    }

    /** Returns true if the device is a known infrastructure adapter (IHC controller, Z2M bridge, etc.) */
    isAdapter(edge: string, device: string): boolean {
        return this.adapters.has(`${edge}:${device}`);
    }
}

export const deviceAvailabilityService = new DeviceAvailabilityServiceImpl();
