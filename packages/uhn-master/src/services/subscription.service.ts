import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import mqttService from "./mqtt.service";

export type SubscriptionEventMap = {
    deviceState: [topic: string, payload: unknown];
    catalog: [topic: string, payload: unknown];
    cmd: [topic: string, payload: unknown];
    deviceCmd: [topic: string, payload: unknown];
};

function tryParseJson(payload: unknown): unknown {
    if (typeof payload === "string") {
        try {
            return JSON.parse(payload);
        } catch (err) {
            AppLogger.warn(undefined, {
                message: "[SubscriptionService] Failed to parse JSON payload",
                object: { payload, err }
            });
            return payload;
        }
    }
    return payload;
}
class SubscriptionService extends EventEmitter<SubscriptionEventMap> {
    constructor() {
        super();
    }

    init() {

        mqttService.subscribe("uhn/+/device/+/state", (topic, payload) => {
            const parsed = tryParseJson(payload);
            this.emit("deviceState", topic, parsed);
        });

        mqttService.subscribe("uhn/+/catalog", (topic, payload) => {
            const parsed = tryParseJson(payload);
            this.emit("catalog", topic, parsed);
        });

        mqttService.subscribe("uhn/+/cmd", (topic, payload) => {
            const parsed = tryParseJson(payload);
            this.emit("cmd", topic, parsed);
        });

        mqttService.subscribe("uhn/+/device/+/cmd", (topic, payload) => {
            const parsed = tryParseJson(payload);
            this.emit("deviceCmd", topic, parsed);
        });
        AppLogger.info(undefined, { message: "[SubscriptionService] MQTT subscriptions initialized and events emitting" });

    }
}
export const subscriptionService = new SubscriptionService();
