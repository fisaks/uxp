import { DeviceAvailabilityEntry } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { parseMqttTopic } from "../util/mqtt-topic.util";
import { subscriptionService } from "./subscription.service";

type DeviceAvailabilityEventMap = {
    availabilityChanged: [entry: DeviceAvailabilityEntry];
};

class DeviceAvailabilityServiceImpl extends EventEmitter<DeviceAvailabilityEventMap> {
    private cache = new Map<string, DeviceAvailabilityEntry>();

    constructor() {
        super();
        this.init();
    }

    private init() {
        subscriptionService.on("deviceAvailability", (topic, payload) => {
            this.handleAvailabilityMessage(topic, payload);
        });
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
}

export const deviceAvailabilityService = new DeviceAvailabilityServiceImpl();
