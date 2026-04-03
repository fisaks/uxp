import { ResourceState } from "@uhn/blueprint";
import { ResourceStateValue } from "@uhn/common";
import { EventEmitter } from "stream";
import { RuntimeStateChange } from "../types/rule-runtime.type";

type RuntimeStateServiceEventMap = {
    stateChanged: [change: RuntimeStateChange];
    stateReset: [];

};
export class RuntimeStateService extends EventEmitter<RuntimeStateServiceEventMap> {
    private state = new Map<string, ResourceState>();

    update(resourceId: string, value: ResourceStateValue | undefined, timestamp: number) {
        const prev = this.state.get(resourceId);

        // Reject stale updates — a newer state is already stored
        if (prev && prev.timestamp > timestamp) return;

        const next: ResourceState = { value, timestamp };
        this.state.set(resourceId, next);

        if (prev?.value === next.value) return;

        this.emit("stateChanged", { resourceId, prev, next });
    }

    /** Update state without emitting stateChanged — rules are not triggered.
     *  Used by setVirtualState to replicate display values to the runtime
     *  without causing rule cascades. */
    updateSilent(resourceId: string, value: ResourceStateValue | undefined, timestamp: number) {
        const prev = this.state.get(resourceId);
        if (prev && prev.timestamp > timestamp) return;
        this.state.set(resourceId, { value, timestamp });
    }

    replaceAll(fullState: Map<string, ResourceState>) {
        this.state = fullState;
        this.emit("stateReset");
    }

    get(resourceId: string): ResourceState | undefined {
        return this.state.get(resourceId);
    }

    snapshot() {
        return new Map(this.state);
    }
}
