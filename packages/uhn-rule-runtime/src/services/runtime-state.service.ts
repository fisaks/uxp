import { ResourceState } from "@uhn/blueprint";
import { ResourceStateValue, RuntimeResourceState } from "@uhn/common";

export class RuntimeStateService {
    private state = new Map<string, ResourceState>();

    update(resourceId: string, value: ResourceStateValue | undefined, ts: number) {
        this.state.set(resourceId, { value, timestamp: ts });
    }

    replaceAll(fullState: Map<string, ResourceState>) {
        this.state = fullState;
    }

    snapshot() {
        return new Map(this.state);
    }
}
