import { DeviceStatePayload } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { subscriptionService } from "./subscription.service";


export type StatePhysicalEventMap = {
    physicalStateChanged: [urn: string, payload: PhysicalDeviceState];
};

export type PhysicalDeviceState = {
    edge: string;
    device: string;
    timestamp: string;
    status: "ok" | "error" | "partial_error";
    errors?: string[];
    digitalOutputs?: Buffer;
    digitalInputs?: Buffer;
    analogOutputs?: Buffer;
    analogInputs?: Buffer;
    raw: DeviceStatePayload;
    emittedAt: number;
};
function isDeviceStatePayload(obj: unknown): obj is DeviceStatePayload {
    return (
        typeof obj === "object" && obj !== null && obj !== undefined &&
        "timestamp" in obj &&
        "name" in obj &&
        "status" in obj
    );
}
function decodeBase64Field(val?: string): Buffer | undefined {
    return val ? Buffer.from(val, "base64") : undefined;
}

function extractEdgeDeviceFromTopic(topic: string): { edge: string; device: string } | null {
    const parts = topic.split("/");
    if (parts.length < 5) return null;
    return {
        edge: parts[1],
        device: parts[3],
    };
}

class StatePhysicalService extends EventEmitter<StatePhysicalEventMap> {
    // Implementation of the service
    private lastDeviceStates: Map<string, PhysicalDeviceState> = new Map();
    private static initialized = false;
    constructor() {
        super();
        if (StatePhysicalService.initialized) return;
        StatePhysicalService.initialized = true;
        subscriptionService.on("deviceState", (topic, payload) => this.handleDeviceState(topic, payload));
    }

    // Example topic: uhn/<edge>/device/<device>/state
    handleDeviceState(topic: string, payload: unknown) {
        if (!isDeviceStatePayload(payload)) {
            AppLogger.warn(undefined, {
                message: `[StatePhysicalService] Invalid payload for topic ${topic}`,
                object: { topic, payload }
            });
            return;
        }

        // Extract edge/device from topic
        const { edge, device } = extractEdgeDeviceFromTopic(topic) ?? {};
        if (!edge || !device) {
            AppLogger.warn(undefined, {
                message: `[StatePhysicalService] Unable to extract edge/device from topic ${topic}`,
                object: { payload }
            });
            return;
        }

        let digitalInputs: Buffer | undefined = undefined;
        let digitalOutputs: Buffer | undefined = undefined;
        let analogInputs: Buffer | undefined = undefined;
        let analogOutputs: Buffer | undefined = undefined;
        if (payload.digitalInputs) digitalInputs = decodeBase64Field(payload.digitalInputs);
        if (payload.digitalOutputs) digitalOutputs = decodeBase64Field(payload.digitalOutputs);
        if (payload.analogInputs) analogInputs = decodeBase64Field(payload.analogInputs);
        if (payload.analogOutputs) analogOutputs = decodeBase64Field(payload.analogOutputs);

        const deviceState: PhysicalDeviceState = {
            edge,
            device,
            timestamp: payload.timestamp,
            status: payload.status,
            digitalInputs,
            digitalOutputs,
            analogInputs,
            analogOutputs,
            errors: payload.errors,
            raw: payload,
            emittedAt: Date.now(),
        };

        // URN for device: uhn:<edge>:<device>
        const urn = `uhn:${edge}:${device}`;
        this.lastDeviceStates.set(urn, deviceState);

        // Emit for listeners (optionally only on change)
        this.emit("physicalStateChanged", urn, deviceState);

        AppLogger.isDebugLevel() && AppLogger.debug({
            message: `[StatePhysicalService] Updated device state`,
            object: { urn, deviceState }
        });
    }

    getDeviceState(urn: string): PhysicalDeviceState | undefined {
        return this.lastDeviceStates.get(urn);
    }

    getAllDeviceStates(): PhysicalDeviceState[] {
        return Array.from(this.lastDeviceStates.values());
    }
}

// Export singleton

export const statePhysicalService = new StatePhysicalService();
