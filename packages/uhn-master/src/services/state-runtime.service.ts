import type { ResourceType } from "@uhn/blueprint";
import { makeAddressKey, Range, resourceIdMatcher, ResourceList, ResourceStateValue, RuntimeResourceState } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";

import { blueprintResourceService } from "./blueprint-resource.service";
import { physicalCatalogService } from "./physical-catalog.service";
import { PhysicalDeviceState, statePhysicalService } from "./state-physical.service";
import { stateSignalService } from "./state-signal.service";


export type StateRuntimeEventMap = {
    runtimeStateReset: [];
    runtimeStateChanged: [resourceId: string, value: ResourceStateValue, timestamp: number];
};
type RuntimeState = {
    physical?: ResourceStateValue
    signal?: ResourceStateValue
    computed: ResourceStateValue
    timestamp: number
}
class StateRuntimeService extends EventEmitter<StateRuntimeEventMap> {
    /** physical-address-key urn -> resourceId */
    private resourceIdByAddress = new Map<string, string>();

    /** resourceId -> current runtime state */
    private stateByResourceId = new Map<string, RuntimeState>();

    constructor() {
        super();

        blueprintResourceService.on(
            "resourcesReloaded",
            (resources) => this.handleResourcesReloaded(resources)
        );

        blueprintResourceService.on(
            "resourcesCleared",
            () => this.reset()
        );

        statePhysicalService.on(
            "physicalStateChanged",
            (_urn, deviceState) => this.handlePhysicalState(deviceState)
        );
        stateSignalService.on(
            "signalStateChanged",
            (resourceId, value, timestamp) => {
                this.handleSignalState(resourceId, value, timestamp);
            }
        );
    }

    /* -------------------------------------------------- */
    /* Blueprint reload handling                          */
    /* -------------------------------------------------- */

    private handleResourcesReloaded(resources: ResourceList) {
        this.reset();
        for (const r of resources) {
            // Only index valid, addressable resources
            if (!r.id) continue;
            if (r.errors?.length) continue;

            const key = makeAddressKey(r);
            if (!key) {
                AppLogger.warn({ message: `[StateRuntimeService] Resource '${r.id}' has no valid address, skipping runtime indexing.` });
                continue;
            }

            this.resourceIdByAddress.set(key, r.id);
        }

        for (const deviceState of statePhysicalService.getAllDeviceStates()) {
            this.handlePhysicalState(deviceState);
        }

        AppLogger.info({
            message: `[StateRuntimeService] Runtime index rebuilt (${this.resourceIdByAddress.size} resources)`,
        });
    }

    private reset() {
        this.resourceIdByAddress.clear();
        this.stateByResourceId.clear();
        this.emit("runtimeStateReset");

        AppLogger.info({
            message: `[StateRuntimeService] Runtime state cleared`,
        });
    }

    private handleSignalState(
        resourceId: string,
        value: ResourceStateValue | undefined,
        timestamp: number
    ) {
        const prev = this.stateByResourceId.get(resourceId);

        if (prev && prev.timestamp >= timestamp) return;

        const signal = value;
        const physical = prev?.physical;
        const computed = signal !== undefined ? signal : physical;
        if (computed === undefined) return
        this.stateByResourceId.set(resourceId, {
            physical: prev?.physical,
            signal,
            computed,
            timestamp
        });

        AppLogger.isDebugLevel() &&
            AppLogger.debug({
                message: `[StateRuntimeService] Resource '${resourceId}' signal state changed`,
                object: { prevValue: prev?.computed, computed, timestamp },
            });
        if (!prev || prev.computed !== computed) {
            this.emit("runtimeStateChanged", resourceId, computed, timestamp);

        }

    }
    /* -------------------------------------------------- */
    /* Physical device updates                            */
    /* -------------------------------------------------- */

    private handlePhysicalState(deviceState: PhysicalDeviceState) {
        const summary = physicalCatalogService.getEdgeDeviceSummary(
            deviceState.edge,
            deviceState.device
        );
        // Digital inputs
        if (deviceState.digitalInputs !== undefined) {
            this.processPins(
                deviceState,
                "digitalInput",
                deviceState.digitalInputs,
                summary?.digitalInputs
            );
        }

        // Digital outputs
        if (deviceState.digitalOutputs !== undefined) {
            this.processPins(
                deviceState,
                "digitalOutput",
                deviceState.digitalOutputs,
                summary?.digitalOutputs
            );
        }
    }

    private processPins(
        deviceState: PhysicalDeviceState,
        type: ResourceType,
        bytes: Buffer,
        range: Range | undefined

    ) {
        const start = range ? range.start : 0;
        const maxPinFromPayload = bytes.length * 8;
        const end = range ? Math.min(range.start + range.count, maxPinFromPayload) : maxPinFromPayload;

        for (let pin = start; pin < end; pin++) {
            const byteIndex = Math.floor(pin / 8);
            const bit = pin % 8;

            const byte = bytes[byteIndex];
            if (byte === undefined) continue;

            const key = makeAddressKey({
                edge: deviceState.edge, device: deviceState.device, type, pin
            });
            if (!key) continue;
            const resourceId = this.resourceIdByAddress.get(key);
            if (!resourceId) continue;

            const value = !!(byte & (1 << bit));
            this.updatePhysicalState(resourceId, value, deviceState.emittedAt);

        }
    }


    /* -------------------------------------------------- */
    /* State handling                                     */
    /* -------------------------------------------------- */

    private updatePhysicalState(
        resourceId: string,
        value: ResourceStateValue,
        timestamp: number

    ) {
        const prev = this.stateByResourceId.get(resourceId);
        if (prev && prev.timestamp >= timestamp) return;
        const signal = prev?.signal;
        const physical = value;
        const computed = physical;
        // IMPORTANT:
        // We must update runtime state BEFORE clearing signal.
        // clearSignalState() emits signalStateChanged, which would otherwise
        // re-enter StateRuntimeService with stale prev state.
        // RuntimeStateService is the single authority for runtime emissions.
        this.stateByResourceId.set(resourceId, {
            physical,
            signal,
            computed,
            timestamp
        });
        AppLogger.isDebugLevel() &&
            AppLogger.debug({
                message: `[StateRuntimeService] Resource '${resourceId}' physical state changed`,
                object: { prevValue: prev?.computed, computed, timestamp },
            });
        if (!prev || prev.computed !== computed) {
            if (prev?.signal !== undefined) stateSignalService.clearSignalState(resourceId);
            this.emit("runtimeStateChanged", resourceId, computed, timestamp);

        }

    }

    /* -------------------------------------------------- */
    /* Public API                                         */
    /* -------------------------------------------------- */

    getResourceState(resourceId: string): RuntimeResourceState | undefined {
        const state = this.stateByResourceId.get(resourceId);
        return state ? {
            resourceId,
            value: state.computed,
            timestamp: state.timestamp
        } : undefined;
    }

    getResourceStates(resourceIds: string[]): RuntimeResourceState[] {
        const states: RuntimeResourceState[] = [];
        if (!resourceIds || resourceIds.length === 0) {
            return states;
        }
        const { exact, wildcards } = resourceIdMatcher(resourceIds);
        for (const id of exact) {
            const s = this.stateByResourceId.get(id);
            if (s) states.push({
                resourceId: id,
                value: s.computed,
                timestamp: s.timestamp
            });
        }
        if (wildcards.length) {
            for (const [id, s] of this.stateByResourceId) {
                if (!exact.has(id) && wildcards.some(rx => rx.test(id))) states.push({
                    resourceId: id,
                    value: s.computed,
                    timestamp: s.timestamp
                });
            }
        }
        return states;
    }
    getResourceStateByUrn(urn: string): RuntimeResourceState | undefined {
        const resourceId = this.resourceIdByAddress.get(urn);
        if (!resourceId) return undefined;
        const state = this.stateByResourceId.get(resourceId)
        return state ? {
            resourceId,
            value: state.computed,
            timestamp: state.timestamp
        } : undefined;
    }

    getAllStates(): RuntimeResourceState[] {
        return Array.from(this.stateByResourceId.entries()).map(([resourceId, state]) => ({
            resourceId,
            value: state.computed,
            timestamp: state.timestamp
        }));
    }
}

export const stateRuntimeService =
    new StateRuntimeService();
