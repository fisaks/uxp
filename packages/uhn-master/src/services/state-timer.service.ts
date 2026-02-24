import { ResourceStateValue } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { parseMqttTopic } from "../util/mqtt-topic.util";
import { blueprintResourceService } from "./blueprint-resource.service";
import { subscriptionService } from "./subscription.service";

export type TimerState = {
    edge: string;
    active: boolean;
    startedAt: number;
    stopAt: number;
    timestamp: number;
};

type TimerMQTTPayload = {
    resourceId: string;
    active: boolean;
    startedAt: number;
    stopAt: number;
    timestamp: number;
};

function isTimerStatePayload(payload: unknown): payload is TimerMQTTPayload {
    return (
        typeof payload === "object" &&
        payload !== null &&
        "resourceId" in payload &&
        "active" in payload &&
        "timestamp" in payload &&
        typeof (payload as TimerMQTTPayload).resourceId === "string" &&
        typeof (payload as TimerMQTTPayload).active === "boolean" &&
        typeof (payload as TimerMQTTPayload).timestamp === "number"
    );
}

export type StateTimerEventMap = {
    timerStateChanged: [resourceId: string, value: ResourceStateValue, timestamp: number, startedAt: number, stopAt: number];
};

class StateTimerService extends EventEmitter<StateTimerEventMap> {
    private timerStateByResourceId = new Map<string, TimerState>();

    constructor() {
        super();
        blueprintResourceService.on("resourcesCleared", () => {
            this.clearAll();
        });
        subscriptionService.on("timerState", (topic, payload) => {
            this.handleTimerState(topic, payload);
        });
    }

    private handleTimerState(topic: string, payload: unknown) {
        // uhn/+/timer/state/+
        const parsed = parseMqttTopic(topic, 5);
        if (!parsed) {
            AppLogger.warn(undefined, {
                message: `[StateTimerService] Invalid timer state topic: ${topic}`,
                object: { topic }
            });
            return;
        }
        const { edge, segments } = parsed;
        const resourceId = segments[4];

        if (isTimerStatePayload(payload)) {
            const prev = this.timerStateByResourceId.get(resourceId);
            if (prev && prev.timestamp >= payload.timestamp) return;

            this.timerStateByResourceId.set(resourceId, {
                edge,
                active: payload.active,
                startedAt: payload.startedAt,
                stopAt: payload.stopAt,
                timestamp: payload.timestamp,
            });

            // Emit as boolean value for the runtime state service
            this.emit("timerStateChanged", resourceId, payload.active, payload.timestamp, payload.startedAt, payload.stopAt);
        }
    }

    clearAll() {
        this.timerStateByResourceId.clear();
    }

    getTimerState(resourceId: string): TimerState | undefined {
        return this.timerStateByResourceId.get(resourceId);
    }

    getAllTimerStates(): Array<[resourceId: string, state: TimerState]> {
        return Array.from(this.timerStateByResourceId.entries());
    }
}

export const stateTimerService = new StateTimerService();
