import type { ResourceType } from "@uhn/blueprint";
import { makeAddressKey, Range, resourceIdMatcher, ResourceList, ResourceStateValue, RuntimeResourceState } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";

import { blueprintResourceService } from "./blueprint-resource.service";
import { physicalCatalogService } from "./physical-catalog.service";
import { DeviceState, physicalDeviceStateService } from "./physical-device-state.service";

export type BlueprintRuntimeStateEventMap = {
    stateReset: [];
    resourceStateChanged: [resourceId: string, value: ResourceStateValue, timestamp: number];
};

class BlueprintRuntimeStateService extends EventEmitter<BlueprintRuntimeStateEventMap> {
    /** physical-address-key urn -> resourceId */
    private resourceIdByAddress = new Map<string, string>();

    /** resourceId -> current runtime state */
    private stateByResourceId = new Map<string, RuntimeResourceState>();

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

        physicalDeviceStateService.on(
            "stateChanged",
            (_urn, deviceState) => this.handleDeviceState(deviceState)
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
                AppLogger.warn({ message: `[BlueprintRuntimeStateService] Resource '${r.id}' has no valid address, skipping runtime indexing.` });
                continue;
            }

            this.resourceIdByAddress.set(key, r.id);
        }

        for (const deviceState of physicalDeviceStateService.getAllDeviceStates()) {
            this.handleDeviceState(deviceState);
        }

        AppLogger.info({
            message: `[BlueprintRuntimeStateService] Runtime index rebuilt (${this.resourceIdByAddress.size} resources)`,
        });
    }

    private reset() {
        this.resourceIdByAddress.clear();
        this.stateByResourceId.clear();
        this.emit("stateReset");

        AppLogger.info({
            message: `[BlueprintRuntimeStateService] Runtime state cleared`,
        });
    }

    /* -------------------------------------------------- */
    /* Physical device updates                            */
    /* -------------------------------------------------- */

    private handleDeviceState(deviceState: DeviceState) {
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
        deviceState: DeviceState,
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
            this.updateState(resourceId, value, deviceState.emittedAt);

        }
    }

    /* -------------------------------------------------- */
    /* State handling                                     */
    /* -------------------------------------------------- */

    private updateState(
        resourceId: string,
        value: ResourceStateValue,
        timestamp: number
    ) {
        const prev = this.stateByResourceId.get(resourceId);
        if (prev && prev.timestamp >= timestamp) return;

        this.stateByResourceId.set(resourceId, { resourceId, value, timestamp });
        AppLogger.isDebugLevel() &&
            AppLogger.debug({
                message: `[BlueprintRuntimeStateService] Resource '${resourceId}' state changed`,
                object: { prevValue:prev?.value, value, timestamp },
            });
        if (!prev || prev.value !== value) {
            this.emit("resourceStateChanged", resourceId, value, timestamp);

        }


    }

    /* -------------------------------------------------- */
    /* Public API                                         */
    /* -------------------------------------------------- */

    getResourceState(resourceId: string) {
        return this.stateByResourceId.get(resourceId);
    }

    getResourceStates(resourceIds: string[]) {
        const states: RuntimeResourceState[] = [];
        if (!resourceIds || resourceIds.length === 0) {
            return states;
        }
        const { exact, wildcards } = resourceIdMatcher(resourceIds);
        for (const id of exact) {
            const s = this.stateByResourceId.get(id);
            if (s) states.push(s);
        }
        if (wildcards.length) {
            for (const [id, s] of this.stateByResourceId) {
                if (!exact.has(id) && wildcards.some(rx => rx.test(id))) states.push(s);
            }
        }
        return states;
    }
    getResourceStateByUrn(urn: string) {
        const resourceId = this.resourceIdByAddress.get(urn);
        return resourceId ? this.stateByResourceId.get(resourceId) : undefined;
    }

    getAllStates() {
        return Array.from(this.stateByResourceId.values());
    }
}

export const blueprintRuntimeStateService =
    new BlueprintRuntimeStateService();
