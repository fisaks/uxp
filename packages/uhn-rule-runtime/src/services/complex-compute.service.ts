import { ResourceBase, ResourceType } from "@uhn/blueprint";
import { ResourceStateValue } from "@uhn/common";
import { runtimeOutput } from "../io/runtime-output";
import { ComplexComputeEntry } from "./runtime-resource.service";
import { RuntimeStateService } from "./runtime-state.service";

/**
 * Runs compute functions for complex resources when their dependency resources change state.
 *
 * Each complex resource has:
 * - A `fn` that takes a Map<resource, value> and returns a value
 * - A `resources` array that defines which dependency resources to watch
 *
 * When any watched resource changes, the fn is called and the result is
 * stored as the complex resource's own state via stateService.update().
 */
export class ComplexComputeService {
    /** Map from dependency resourceId → compute entries that depend on it */
    private readonly dependencyMap = new Map<string, ComplexComputeEntry[]>();

    constructor(
        private readonly entries: readonly ComplexComputeEntry[],
        private readonly stateService: RuntimeStateService
    ) {
        // Build reverse index: dependency resourceId → entries
        for (const entry of entries) {
            for (const resource of entry.resources) {
                const id = resource.id;
                if (!id) continue;
                let dependents = this.dependencyMap.get(id);
                if (!dependents) {
                    dependents = [];
                    this.dependencyMap.set(id, dependents);
                }
                dependents.push(entry);
            }
        }

        // Listen for state changes
        stateService.on("stateChanged", (change) => {
            this.handleStateChange(change.resourceId);
        });

        stateService.on("stateReset", () => {
            this.recomputeAll();
        });

        runtimeOutput.log({
            level: "info",
            component: "ComplexComputeService",
            message: `Watching ${this.dependencyMap.size} resource(s) for ${entries.length} compute entry/entries.`,
        });
    }

    private handleStateChange(resourceId: string) {
        const dependents = this.dependencyMap.get(resourceId);
        if (!dependents) return;

        for (const entry of dependents) {
            this.recompute(entry);
        }
    }

    private recomputeAll() {
        for (const entry of this.entries) {
            this.recompute(entry);
        }
    }

    private recompute(entry: ComplexComputeEntry) {
        const values = new Map<ResourceBase<ResourceType>, ResourceStateValue>();

        for (const resource of entry.resources) {
            const state = this.stateService.get(resource.id!);
            if (state?.value !== undefined) {
                values.set(resource, state.value);
            }
        }

        // Don't compute if no dependency has a value yet
        if (values.size === 0) return;

        try {
            const result = entry.fn(values);
            const timestamp = Date.now();
            this.stateService.update(entry.complexResourceId, result, timestamp);

            // Send computed value to master via IPC
            runtimeOutput.send({
                kind: "event",
                cmd: "logicalResourceStateChanged",
                payload: { resourceId: entry.complexResourceId, value: result, timestamp },
            });
        } catch (err) {
            runtimeOutput.log({
                level: "error",
                component: "ComplexComputeService",
                message: `Compute fn failed for "${entry.complexResourceId}": ${err instanceof Error ? err.message : String(err)}`,
            });
        }
    }
}
