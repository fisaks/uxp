import { DeviceAvailabilityEntry } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { parseMqttTopic } from "../util/mqtt-topic.util";
import { subscriptionService } from "./subscription.service";

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

    private handleAvailabilityMessage(topic: string, payload: string | null) {
        // Topic: uhn/{edge}/device/{device}/availability
        const parsed = parseMqttTopic(topic, 5);
        if (!parsed) return;

        const { edge, segments } = parsed;
        const device = segments[3];

        // Payload is "online" or "offline" (plain text, normalized by the edge)
        if (payload === null) return;
        const available = payload.trim() === "online";

        const key = `${edge}:${device}`;
        const existing = this.cache.get(key);

        // Only emit on actual change
        if (existing && existing.available === available) return;

        const entry: DeviceAvailabilityEntry = {
            edge,
            device,
            available,
            updatedAt: Date.now(),
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
