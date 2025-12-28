import type { ResourceType } from "@uhn/blueprint";
import { makeAddressKey, Range, resourceIdMatcher, ResourceStateValue, RuntimeResourceList, RuntimeResourceState } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";

import { blueprintResourceService } from "./blueprint-resource.service";
import { physicalCatalogService } from "./physical-catalog.service";
import { PhysicalDeviceState, statePhysicalService } from "./state-physical.service";
import { stateSignalService } from "./state-signal.service";


/**
 * runtimeStateChanged:
 *  - value === undefined means the runtime state is now unknown
 *    (no physical state and no signal override).
 *  - Consumers must treat undefined as "unknown", not false/off.
 */
export type StateRuntimeEventMap = {
    runtimeStateReset: [];
    runtimeStateChanged: [resourceId: string, value: ResourceStateValue | undefined, timestamp: number];
    runtimeStatesChanged: [RuntimeResourceState[]];

};

/**
 * Internal runtime state.
 *
 * - physical: last known physical value (P)
 * - signal: current signal override (S), if any
 * - computed: effective runtime value (C)
 *
 * physical and signal may be undefined individually,
 * but computed is only stored when at least one is known.
 */
type RuntimeState = {
    physical?: ResourceStateValue
    physicalTimestamp?: number;
    signal?: ResourceStateValue
    signalTimestamp?: number;
    computed: ResourceStateValue
    timestamp: number
}
/**
 * Runtime semantics:
 *
 * - Physical state (P) is authoritative but may be refreshed without change.
 * - Signal state (S) temporarily overrides P while defined.
 * - Computed state (C) = S if S is defined, otherwise P.
 *
 * Signal clearing rules:
 * - S is cleared ONLY when P changes value.
 * - Periodic physical state refreshes do NOT clear S.
 *
 * Timestamp rules:
 * - Physical and signal updates are ordered independently.
 * - Runtime timestamp represents last effective C change.
 */

class StateRuntimeService extends EventEmitter<StateRuntimeEventMap> {
    /** physical-address-key urn -> resourceId */
    private resourceIdByAddress = new Map<string, string>();

    /** resourceId -> current runtime state */
    private stateByResourceId = new Map<string, RuntimeState>();
    private emitStateChanges: boolean;

    constructor() {
        super();
        this.emitStateChanges = false;
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

    private handleResourcesReloaded(resources: RuntimeResourceList) {
        this.reset();
        const addressLookup = new Map<string, string>();
        for (const r of resources) {
            // Only index valid, addressable resources
            if (!r.id) continue;
            if (r.errors?.length) continue;

            const key = makeAddressKey(r);
            if (!key) {
                AppLogger.warn({ message: `[StateRuntimeService] Resource '${r.id}' has no valid address, skipping runtime indexing.` });
                continue;
            }

            addressLookup.set(key, r.id);
        }
        // swap in place once lookup is ready
        this.resourceIdByAddress = addressLookup;

        for (const deviceState of statePhysicalService.getAllDeviceStates()) {
            this.handlePhysicalState(deviceState);
        }
        for (const [resourceId, state] of stateSignalService.getAllSignalStates()) {
            this.handleSignalState(resourceId, state.value, state.timestamp);
        }
        this.emit("runtimeStatesChanged", this.getAllStates());
        this.emitStateChanges = true;

        AppLogger.info({
            message: `[StateRuntimeService] Runtime index rebuilt (${this.resourceIdByAddress.size} resources)`,
        });
    }

    /**
     * Clears all runtime state.
     *
     * Note:
     *  - Signal state (S) is NOT cleared here.
     */
    private reset() {
        this.resourceIdByAddress.clear();
        this.stateByResourceId.clear();
        if (this.emitStateChanges) this.emit("runtimeStateReset");
        this.emitStateChanges = false;
        AppLogger.info({
            message: `[StateRuntimeService] Runtime state cleared`,
        });
    }

    /**
    * Handles changes in signal state (S).
    *
    * Notes:
    *  - Signal overrides physical while defined.
    *  - Clearing signal does NOT invent a physical value.
    *  - If physical state is unknown and signal is cleared,
    *    the runtime state becomes unknown and is removed.
    *
    */

    private handleSignalState(
        resourceId: string,
        value: ResourceStateValue | undefined,
        timestamp: number
    ) {
        // return early if no lookup exists
        if (this.resourceIdByAddress.size === 0) return;

        const prev = this.stateByResourceId.get(resourceId);
        if (this.isStaleMessage(prev?.signalTimestamp, timestamp)) return;

        // signal already cleared no need to do anything
        if (value === undefined && prev?.signal === undefined) {
            return;
        }
        const signal = value;
        const physical = prev?.physical;
        const computed = signal !== undefined ? signal : physical;

        if (computed === undefined) {
            if (prev) {
                this.stateByResourceId.delete(resourceId);
                this.emitRuntimeStateChangedIfEnabled(resourceId, undefined, timestamp);
            }
            return;
        }
        const physicalTimestamp = prev?.physicalTimestamp;
        const signalTimestamp = value !== undefined ? timestamp : undefined;
        const computedTimestamp = computed !== prev?.computed ? timestamp : prev!.timestamp;
        this.stateByResourceId.set(resourceId, {
            physical,
            physicalTimestamp,
            signal,
            signalTimestamp,
            computed,
            timestamp: computedTimestamp,
        });
        AppLogger.isDebugLevel() &&
            AppLogger.debug({
                message: `[StateRuntimeService] Resource '${resourceId}' signal state changed`,
                object: {
                    physical,
                    physicalTimestamp,
                    prevSignal: prev?.signal,
                    signal,
                    signalTimestamp,
                    prevComputed: prev?.computed,
                    computed,
                    timestamp: computedTimestamp
                },
            });

        if (!prev || prev.computed !== computed) {
            this.emitRuntimeStateChangedIfEnabled(resourceId, computed, timestamp);
        }

    }
    /* -------------------------------------------------- */
    /* Physical device updates                            */
    /* -------------------------------------------------- */

    private handlePhysicalState(deviceState: PhysicalDeviceState) {
        if (this.resourceIdByAddress.size === 0) return;
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

    /**
     * Maps physical device bits to resourceIds and forwards them
     * to updatePhysicalState().
     *
     * This method performs NO logic beyond bit extraction.
     * All semantics live in updatePhysicalState().
     */
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
        if (this.isStaleMessage(prev?.physicalTimestamp, timestamp)) return;

        const prevPhysical = prev?.physical;
        const hadSignal = prev?.signal !== undefined;

        const physical = value;

        const physicalChanged =
            prevPhysical !== undefined && prevPhysical !== physical;

        const shouldClearSignal = hadSignal && physicalChanged;

        const signal = shouldClearSignal ? undefined : prev?.signal;

        const computed = signal !== undefined ? signal : physical;
        const computedTimestamp = computed !== prev?.computed ? timestamp : prev!.timestamp;
        this.stateByResourceId.set(resourceId, {
            physical,
            physicalTimestamp: timestamp,
            signal,
            signalTimestamp: prev?.signalTimestamp,
            computed,
            timestamp: computedTimestamp,
        });

        AppLogger.isDebugLevel() &&
            AppLogger.debug({
                message: `[StateRuntimeService] Resource '${resourceId}' physical state update`,
                object: {
                    prevPhysical,
                    physical,
                    physicalTimestamp: timestamp,
                    physicalChanged,
                    hadSignal,
                    shouldClearSignal,
                    signal,
                    signalTimestamp: prev?.signalTimestamp,
                    prevComputed: prev?.computed,
                    computed,
                    computedTimestamp,
                },
            });

        if (shouldClearSignal) {
            stateSignalService.clearSignalState(resourceId);
        }
        if (!prev || prev.computed !== computed) {
            this.emitRuntimeStateChangedIfEnabled(resourceId, computed, timestamp);
        }

    }

    private emitRuntimeStateChangedIfEnabled(resourceId: string, computed: ResourceStateValue | undefined, timestamp: number) {
        if (this.emitStateChanges) {
            this.emit("runtimeStateChanged", resourceId, computed, timestamp);
        }
    }
    private isStaleMessage(prevSignalTimestamp: number | undefined, timestamp: number) {
        return prevSignalTimestamp !== undefined && prevSignalTimestamp >= timestamp;
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
