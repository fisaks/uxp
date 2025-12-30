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
        const next: ResourceState = { value, timestamp };

        // Always update but only emit if value has changed
        this.state.set(resourceId, next);
        if (prev?.value === next.value) {
            return;
        }

        this.emit("stateChanged", {
            resourceId,
            prev,
            next,
        });
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
