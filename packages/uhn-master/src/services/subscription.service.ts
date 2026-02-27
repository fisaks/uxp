import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import mqttService from "./mqtt.service";

type SubscriptionEventMap = {
    deviceState: [topic: string, payload: unknown];
    signalState: [topic: string, payload: unknown];
    timerState: [topic: string, payload: unknown];
    muteEvent: [topic: string, payload: unknown];
    catalog: [topic: string, payload: unknown];
    cmd: [topic: string, payload: unknown];
    deviceCmd: [topic: string, payload: unknown];
    edgeStatus: [topic: string, payload: string | null];
    edgeIdentity: [topic: string, payload: unknown];
    edgeRuntimeRules: [topic: string, payload: unknown];
    edgeRuntimeStatus: [topic: string, payload: string | null];
    edgeBlueprintActivated: [topic: string, payload: unknown];
    edgeSystemConfig: [topic: string, payload: unknown];
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

        }
    }

    return payload === null ||
        (Buffer.isBuffer(payload) && payload.length === 0) ||
        payload === "" ? null : payload;
}
function tryParseString(payload: unknown): string | null {
    if (typeof payload === "string") {
        return payload;
    }

    if (Buffer.isBuffer(payload)) {
        // Treat empty buffers as null, otherwise decode as UTF-8 string
        if (payload.length === 0) {
            return null;
        }
        return payload.toString("utf8");
    }

    // For all other payload types, fall back to null
    return null;
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

        mqttService.subscribe("uhn/+/signal/state/+", (topic, payload) => {
            const parsed = tryParseJson(payload);
            this.emit("signalState", topic, parsed);
        });

        mqttService.subscribe("uhn/+/timer/state/+", (topic, payload) => {
            const parsed = tryParseJson(payload);
            this.emit("timerState", topic, parsed);
        });

        mqttService.subscribe("uhn/+/mute/event", (topic, payload) => {
            const parsed = tryParseJson(payload);
            this.emit("muteEvent", topic, parsed);
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

        mqttService.subscribe("uhn/+/status", (topic, payload) => {
            const parsed = tryParseString(payload);
            if (topic === "uhn/master/status") {
                return;
            }
            this.emit("edgeStatus", topic, parsed);
        });

        mqttService.subscribe("uhn/+/identity", (topic, payload) => {
            const parsed = tryParseJson(payload);
            if(topic === "uhn/master/identity") {
                return;
            }
            this.emit("edgeIdentity", topic, parsed);
        });

        mqttService.subscribe("uhn/+/runtime/rules", (topic, payload) => {
            if (topic === "uhn/master/runtime/rules") return;
            const parsed = tryParseJson(payload);
            this.emit("edgeRuntimeRules", topic, parsed);
        });

        mqttService.subscribe("uhn/+/runtime/status", (topic, payload) => {
            if (topic === "uhn/master/runtime/status") return;
            const parsed = tryParseString(payload);
            this.emit("edgeRuntimeStatus", topic, parsed);
        });

        mqttService.subscribe("uhn/+/blueprint/activated", (topic, payload) => {
            if (topic === "uhn/master/blueprint/activated") return;
            const parsed = tryParseJson(payload);
            this.emit("edgeBlueprintActivated", topic, parsed);
        });

        mqttService.subscribe("uhn/+/system/config", (topic, payload) => {
            if (topic === "uhn/master/system/config") return;
            const parsed = tryParseJson(payload);
            this.emit("edgeSystemConfig", topic, parsed);
        });

        AppLogger.info(undefined, { message: "[SubscriptionService] MQTT subscriptions initialized and events emitting" });


    }
}
export const subscriptionService = new SubscriptionService();
