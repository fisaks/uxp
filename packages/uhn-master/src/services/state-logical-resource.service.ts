import { ResourceStateDetails, ResourceStateValue, RuleRuntimeLogicalResourceStateChangedMessage } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { parseMqttTopic } from "../util/mqtt-topic.util";
import { blueprintResourceService } from "./blueprint-resource.service";
import { ruleRuntimeProcessService } from "./rule-runtime-process.service";
import { subscriptionService } from "./subscription.service";

export type LogicalResourceState = {
    host: string;
    value: ResourceStateValue;
    timestamp: number;
    details?: ResourceStateDetails;
};

type LogicalResourceMQTTPayload = {
    resourceId: string;
    value: ResourceStateValue;
    timestamp: number;
    details?: ResourceStateDetails;
};

function isLogicalResourceStatePayload(payload: unknown): payload is LogicalResourceMQTTPayload {
    return (
        typeof payload === "object" &&
        payload !== null &&
        "resourceId" in payload &&
        "value" in payload &&
        "timestamp" in payload &&
        typeof (payload as LogicalResourceMQTTPayload).resourceId === "string" &&
        typeof (payload as LogicalResourceMQTTPayload).timestamp === "number"
    );
}

export type LogicalResourceStateEventMap = {
    stateChanged: [resourceId: string, value: ResourceStateValue, timestamp: number, details?: ResourceStateDetails];
};

class LogicalResourceStateService extends EventEmitter<LogicalResourceStateEventMap> {
    /**
     * Cache of logical resource state. StateRuntimeService replays this on
     * blueprint reload (when it resets its own state) since MQTT retained
     * messages are only delivered once on initial subscription.
     */
    private stateByResourceId = new Map<string, LogicalResourceState>();

    constructor() {
        super();
        blueprintResourceService.on("resourcesCleared", () => {
            this.clearAll();
        });
        subscriptionService.on("logicalResourceState", (topic, payload) => {
            this.handleMqttState(topic, payload);
        });
        ruleRuntimeProcessService.on("onLogicalResourceStateChanged", (msg) => {
            this.handleLocalState(msg.payload);
        });
    }

    private handleMqttState(topic: string, payload: unknown) {
        // uhn/+/logical-resource/state/+
        const parsed = parseMqttTopic(topic, 5);
        if (!parsed) {
            AppLogger.warn(undefined, {
                message: `[LogicalResourceStateService] Invalid logical resource state topic: ${topic}`,
                object: { topic }
            });
            return;
        }
        const { edge, segments } = parsed;
        const resourceId = segments[4];

        if (isLogicalResourceStatePayload(payload)) {
            const prev = this.stateByResourceId.get(resourceId);
            if (prev && prev.timestamp >= payload.timestamp) return;

            this.stateByResourceId.set(resourceId, {
                host: edge,
                value: payload.value,
                timestamp: payload.timestamp,
                ...(payload.details && { details: payload.details }),
            });

            this.emit("stateChanged", resourceId, payload.value, payload.timestamp, payload.details);
        }
    }

    handleLocalState(payload: RuleRuntimeLogicalResourceStateChangedMessage["payload"]) {
        const resourceId = payload.resourceId;
        const timestamp = payload.timestamp;
        const prev = this.stateByResourceId.get(resourceId);
        if (prev && prev.timestamp >= timestamp) return;

        this.stateByResourceId.set(resourceId, {
            host: "master",
            value: payload.value,
            timestamp,
            ...(payload.details && { details: payload.details }),
        });
        this.emit("stateChanged", resourceId, payload.value, timestamp, payload.details);
    }

    clearAll() {
        this.stateByResourceId.clear();
    }

    getState(resourceId: string): LogicalResourceState | undefined {
        return this.stateByResourceId.get(resourceId);
    }

    getAllStates(): Array<[resourceId: string, state: LogicalResourceState]> {
        return Array.from(this.stateByResourceId.entries());
    }
}

export const logicalResourceStateService = new LogicalResourceStateService();
