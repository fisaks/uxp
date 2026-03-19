import type { ResourceType } from "@uhn/blueprint";
import { ResourceStateValue } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { parseMqttTopic } from "../util/mqtt-topic.util";
import { subscriptionService } from "./subscription.service";

type DevicePinMQTTPayload = {
    type: ResourceType;
    pin: number;
    value: ResourceStateValue;
    timestamp: number;
};

export type DevicePinState = {
    edge: string;
    device: string;
    type: ResourceType;
    pin: number;
    value: ResourceStateValue;
    timestamp: number;
};

function isDevicePinStatePayload(payload: unknown): payload is DevicePinMQTTPayload {
    return (
        typeof payload === "object" &&
        payload !== null &&
        "type" in payload &&
        "pin" in payload &&
        "value" in payload &&
        "timestamp" in payload &&
        typeof (payload as DevicePinMQTTPayload).type === "string" &&
        typeof (payload as DevicePinMQTTPayload).pin === "number" &&
        typeof (payload as DevicePinMQTTPayload).timestamp === "number"
    );
}

export type DevicePinStateEventMap = {
    devicePinStateChanged: [state: DevicePinState];
};

/**
 * Handles per-pin physical state from MQTT (topic: uhn/+/device/+/pin/+).
 * Used by drivers that produce individual typed values (IHC, future Zigbee, etc.)
 * as opposed to device-level byte arrays (Modbus).
 *
 * Caches state keyed by physical address for replay during blueprint reload
 * (retained MQTT messages are only delivered once on initial subscription).
 *
 * Emits devicePinStateChanged which StateRuntimeService uses to look up
 * the resource ID via makeAddressKey and route to updatePhysicalState()
 * for three-tier P/S/C processing.
 */
class DevicePinStateService extends EventEmitter<DevicePinStateEventMap> {
    /** Cache keyed by "{edge}:{device}:{pin}" */
    private stateByAddress = new Map<string, DevicePinState>();

    constructor() {
        super();
        subscriptionService.on("devicePinState", (topic, payload) => {
            this.handleDevicePinState(topic, payload);
        });
    }

    private handleDevicePinState(topic: string, payload: unknown) {
        // Topic format: uhn/{edge}/device/{device}/pin/{pin} — 6 segments
        const parsed = parseMqttTopic(topic, 6);
        if (!parsed) {
            AppLogger.warn(undefined, {
                message: `[DevicePinStateService] Invalid topic: ${topic}`,
                object: { topic },
            });
            return;
        }

        if (!isDevicePinStatePayload(payload)) {
            AppLogger.warn(undefined, {
                message: `[DevicePinStateService] Invalid payload for topic ${topic}`,
                object: { topic, payload },
            });
            return;
        }

        const { edge, segments } = parsed;
        const device = segments[3];

        const state: DevicePinState = {
            edge,
            device,
            type: payload.type,
            pin: payload.pin,
            value: payload.value,
            timestamp: payload.timestamp,
        };

        const cacheKey = `${edge}:${device}:${payload.pin}`;
        const prev = this.stateByAddress.get(cacheKey);
        if (prev && prev.timestamp >= payload.timestamp) return;

        this.stateByAddress.set(cacheKey, state);

        AppLogger.isDebugLevel() &&
            AppLogger.debug({
                message: `[DevicePinStateService] Pin state`,
                object: { edge, device, type: payload.type, pin: payload.pin, value: payload.value },
            });

        this.emit("devicePinStateChanged", state);
    }

    getAllStates(): DevicePinState[] {
        return Array.from(this.stateByAddress.values());
    }
}

export const devicePinStateService = new DevicePinStateService();
