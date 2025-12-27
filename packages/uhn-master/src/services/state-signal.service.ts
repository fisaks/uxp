import { ResourceStateValue } from "@uhn/common";
import { EventEmitter } from "events";

export type StateSignalEventMap = {
    signalStateChanged: [resourceId: string, value: ResourceStateValue | undefined, timestamp: number];
};

class StateSignalService extends EventEmitter<StateSignalEventMap> {
    private signalStateByResourceId = new Map<string, ResourceStateValue>();
    /* -------------------------------------------------- */
    /* Software injection                                 */
    /* -------------------------------------------------- */

    setSignalState(resourceId: string, value: ResourceStateValue) {
        const prev = this.signalStateByResourceId.get(resourceId);
        if (prev === value) return;

        this.signalStateByResourceId.set(resourceId, value);
        this.persist(resourceId, value);
        this.emit("signalStateChanged", resourceId, value, Date.now());
    }

    clearSignalState(resourceId: string) {
        if (!this.signalStateByResourceId.has(resourceId)) return;

        this.signalStateByResourceId.delete(resourceId);
        this.persist(resourceId, undefined);
        this.emit("signalStateChanged", resourceId, undefined, Date.now());
    }

    /* -------------------------------------------------- */
    /* Persistence (simple placeholder)                   */
    /* -------------------------------------------------- */

    private persist(resourceId: string, value: ResourceStateValue | undefined) {
        // TODO: write to DB / KV store
    }

    restore(initial: Record<string, ResourceStateValue>) {
        for (const [id, value] of Object.entries(initial)) {
            this.signalStateByResourceId.set(id, value);
        }
    }

    clearAll() {
        this.signalStateByResourceId.clear();
        // TODO: clear persistence
    }

    getSignalState(resourceId: string): ResourceStateValue | undefined {
        return this.signalStateByResourceId.get(resourceId);
    }
}

export const stateSignalService = new StateSignalService();
