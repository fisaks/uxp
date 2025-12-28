import { ResourceStateValue, RuntimeResource } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { blueprintResourceService } from "./blueprint-resource.service";
import { isSignalStatePayload, SignalEdgeService } from "./signal-edge.service";
import { subscriptionService } from "./subscription.service";

export type StateSignalEventMap = {
    signalStateChanged: [resourceId: string, value: ResourceStateValue | undefined, timestamp: number];
};
export type SignalState = {
    edge: string
    value: ResourceStateValue;
    timestamp: number;
}

class StateSignalService extends EventEmitter<StateSignalEventMap> {
    // Signal state is transient and not persisted.
    // Signals represent temporary overrides and are lost on restart.

    private signalStateByResourceId = new Map<string, SignalState>();
    private signalEdgeService: SignalEdgeService;
    constructor() {
        super();
        this.signalEdgeService = new SignalEdgeService();
        blueprintResourceService.on(
            "resourcesCleared",
            () => {
                // Lifecycle reset: signals refer to resourceIds that are no longer valid.
                // We do not emit per-resource signalStateChanged events here.
                this.clearAll();
            }
        );
        subscriptionService.on(
            "signalState",
            (topic, payload) => {
                this.handleSignalState(topic, payload);
            }
        );
    }

    private handleSignalState(topic: string, payload: unknown) {
        //uhn/+/signal/state/+
        const parts = topic.split("/");
        if (parts.length < 5) {
            AppLogger.warn(undefined, {
                message: `[StateSignalService] Invalid signal state topic: ${topic}`,
                object: { topic }
            });
            return;
        }
        const edge = parts[1];
        const resourceId = parts[4];
        AppLogger.isTraceLevel() &&
            AppLogger.trace({
                message: `[StateSignalService] Received signal state for resource ${resourceId} on edge ${edge}`,
                object: { topic, payload }
            });
        if (isSignalStatePayload(payload)) {
            const prev = this.signalStateByResourceId.get(resourceId);
            if (prev && prev.timestamp >= payload.timestamp) return;
            this.signalStateByResourceId.set(resourceId,
                { edge, value: payload.value, timestamp: payload.timestamp }
            );
            this.emit("signalStateChanged", resourceId, payload.value, payload.timestamp);
        } else if (payload == null) {
            if (!this.signalStateByResourceId.has(resourceId)) return;
            this.signalStateByResourceId.delete(resourceId);
            this.emit("signalStateChanged", resourceId, undefined, Date.now());
        }
    }

    setSignalState(resource: Pick<RuntimeResource, "edge" | "id">, value: ResourceStateValue) {
        const timestamp = Date.now();

        this.signalStateByResourceId.set(resource.id, {
            edge: resource.edge,
            value,
            timestamp,
        });

        this.emit("signalStateChanged", resource.id, value, timestamp);
        this.signalEdgeService.sendStateSignalToEdge(resource, { value, timestamp });
    }

    clearSignalState(resourceId: string) {
        const state = this.signalStateByResourceId.get(resourceId);
        if (!state) return;
        const ts = Date.now();

        this.signalStateByResourceId.delete(resourceId);
        this.emit("signalStateChanged", resourceId, undefined, ts);
        this.signalEdgeService.clearStateSignalOnEdge({ id: resourceId, edge: state.edge });
    }

    clearAll() {
        const entries = Array.from(this.signalStateByResourceId.entries());
        const ts = Date.now();
        this.signalStateByResourceId.clear();
        for (const [resourceId, state] of entries) {
            this.emit("signalStateChanged", resourceId, undefined, ts);
            this.signalEdgeService.clearStateSignalOnEdge({
                id: resourceId,
                edge: state.edge
            });
        }
    }

    getSignalState(resourceId: string): SignalState | undefined {
        return this.signalStateByResourceId.get(resourceId);
    }

    getAllSignalStates(): Array<[resourceId: string, state: SignalState]> {
        return Array.from(this.signalStateByResourceId.entries());
    }
}

export const stateSignalService = new StateSignalService();
