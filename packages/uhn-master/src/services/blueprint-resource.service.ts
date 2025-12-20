import { ResourceType } from "@uhn/blueprint";
import { makeAddressKey, ResourceErrorCode, ResourceValidationError, RuntimeResourceBase } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { BlueprintFileUtil } from "../util/blueprint-file.util";
import { blueprintRuntimeService } from "./blueprint-runtime.service";
import { physicalCatalogService } from "./physical-catalog.service";
import { workerService } from "./worker.service";

type ResourceList = RuntimeResourceBase<ResourceType>[];
export type ResourceEventMap = {
    resourcesReloaded: [resources: ResourceList, validationErrors: ResourceValidationError[]];
    error: [error: unknown];
    resourcesCleared: [];
};

class BlueprintResourceService extends EventEmitter<ResourceEventMap> {
    private resources: ResourceList = [];
    private loading = false;
    private catalogChangedDuringLoad = false;
    private resourceLoaded = false;
    private validationErrors: ResourceValidationError[] = [];

    constructor() {
        super();

        blueprintRuntimeService.on("workerReady", () => {
            AppLogger.info({
                message: `[BlueprintResourceService] Worker is ready, loading resources.`,
            });
            this.reloadResources().catch(err => {
                AppLogger.error({
                    message: `[BlueprintResourceService] Failed to load resources on worker ready:`,
                    error: err,
                });
            });
        });

        blueprintRuntimeService.on("workerStopped", () => {
            AppLogger.info({
                message: `[BlueprintResourceService] Worker stopped, clearing resources.`,
            });
            this.clearResources();
        });
        physicalCatalogService.on("catalogChanged", () => this.handleCatalogChange());

    }
    private handleCatalogChange() {
        if (!this.loading && this.resourceLoaded) {
            AppLogger.info({
                message: `[BlueprintResourceService] Catalog changed, reloading resources.`,
            });
            this.reloadResources().catch(err => {
                AppLogger.error({
                    message: `[BlueprintResourceService] Failed to reload resources on catalog change:`,
                    error: err,
                });
            })
        }
        if (this.loading) {
            this.catalogChangedDuringLoad = true;
        }
    }

    async reloadResources() {
        if (this.loading) return;
        try {
            this.resourceLoaded = false;
            this.loading = true;
            await this.reloadResourcesFromWorker();
            if (this.catalogChangedDuringLoad) {
                this.catalogChangedDuringLoad = false;
                AppLogger.info({
                    message: `[BlueprintResourceService] Catalog changed during resource load, reloading resources again.`,
                });
                await this.reloadResourcesFromWorker();
            }
        } finally {
            this.loading = false;
        }
    }

    private async reloadResourcesFromWorker() {
        try {
            const resp = await workerService.runCommand({
                cmd: "listResources",
            });

            const resources = resp.resources ?? [];
            const validatedResources = this.validateResources(resources);
            this.resources = validatedResources.resources;
            this.validationErrors = validatedResources.validationErrors;

            AppLogger.isDebugLevel() && AppLogger.debug({
                message: `[BlueprintResourceService] Loaded resources`,
                object: { resources: this.resources }

            });
            this.resourceLoaded = true;
            this.emit("resourcesReloaded", this.resources, this.validationErrors);
            await this.writeResourcesToFile();
            AppLogger.info({
                message: `[BlueprintResourceService] Loaded ${this.resources.length} resources from active blueprint.`,
            });
            if (this.validationErrors.length) {
                AppLogger.warn(undefined, {
                    message: `[BlueprintResourceService] Found ${this.validationErrors.length} resource validation error(s)`,
                    object: { validationErrors: this.validationErrors }
                });
            }

        } catch (err) {
            this.resources = [];
            this.emit("error", err);
            AppLogger.error({
                message: `[BlueprintResourceService] Failed to load resources from active blueprint:`,
                error: err,
            });

        }

    }
    private async writeResourcesToFile() {
        try {
            await BlueprintFileUtil.writePrettyJson("resources.json", this.resources)
            await BlueprintFileUtil.writePrettyJson("resource-validation-errors.json", this.validationErrors)
        } catch (err) {
            AppLogger.error({
                message: `[BlueprintResourceService] Failed to write resources to file:`,
                error: err,
            });
        }
    }

    /** Validates the resource list and annotates resources with errors. */
    private validateResources(resources: ResourceList) {
        const errors: ResourceValidationError[] = [];
        const idMap = new Map<string, RuntimeResourceBase<ResourceType>>();
        const addressMap = new Map<string, RuntimeResourceBase<ResourceType>>();
        for (const resource of resources) {
            resource.errors = []; // ensure it's always present
            const addErr = (code: ResourceErrorCode, details: string, conflictingId?: string
            ) => {
                resource.errors!.push(code);
                errors.push({
                    type: code,
                    resourceId: resource.id,
                    conflictingId,
                    details,
                });
            };
            // 1. Missing ID check
            if (!resource.id) {
                addErr(
                    "missing-id",
                    `Resource "${resource.name ?? "[unnamed]"}" is missing an 'id' field.`
                );
            } else {
                // 2) Duplicate ID (only possible if id exists)
                if (idMap.has(resource.id)) {
                    const conflict = idMap.get(resource.id)!;
                    addErr(
                        "duplicate-id",
                        `Duplicate resource ID '${resource.id}' in resources: ${conflict.name ?? conflict.id
                        }, ${resource.name ?? resource.id}`,
                        conflict.id
                    );
                } else {
                    idMap.set(resource.id, resource);
                }
            }

            // 3) Duplicate physical address
            const addrKey = makeAddressKey(resource);
            if (addrKey) {
                if (addressMap.has(addrKey)) {
                    const conflict = addressMap.get(addrKey)!;
                    addErr(
                        "duplicate-address",
                        `Duplicate address (${addrKey}) for resources: ${conflict.name ?? conflict.id
                        }, ${resource.name ?? resource.id}`,
                        conflict.id
                    );
                } else {
                    addressMap.set(addrKey, resource);
                }
            }

            // 4. Catalog validation: check device and pin are valid (if catalog available)
            if (resource.edge && resource.device) {
                const edgeCatalog = physicalCatalogService.getEdgeCatalog(resource.edge);
                if (!edgeCatalog) {
                    addErr(
                        "unknown-edge",
                        `Resource references unknown edge '${resource.edge}'.`
                    );
                } else {
                    const catalogDevice = edgeCatalog.devices.find(
                        (d) => d.name === resource.device
                    );

                    if (!catalogDevice) {
                        addErr(
                            "unknown-device",
                            `Resource references unknown device '${resource.device}' on edge '${resource.edge}'.`
                        );
                    } else if (typeof resource.pin === "number") {
                        let validPin = false;

                        if (resource.type === "digitalInput" && catalogDevice.digitalInputs) {
                            const { start, count } = catalogDevice.digitalInputs;
                            validPin =
                                resource.pin >= start && resource.pin < start + count;
                        } else if (
                            resource.type === "digitalOutput" &&
                            catalogDevice.digitalOutputs
                        ) {
                            const { start, count } = catalogDevice.digitalOutputs;
                            validPin =
                                resource.pin >= start && resource.pin < start + count;
                        }

                        if (!validPin) {
                            addErr(
                                "invalid-pin",
                                `Resource has invalid pin '${resource.pin}' for device '${resource.device}' on edge '${resource.edge}'.`
                            );
                        }
                    }
                }
            }

        }
        return {
            resources: [...resources],
            validationErrors: [...errors]
        };
    }

    getValidationErrors() {
        return [...this.validationErrors];
    }
    getInvalidResources(): ResourceList {
        return this.resources.filter(r => r.errors && r.errors.length > 0);
    }
    clearResources() {
        AppLogger.info({
            message: `[BlueprintResourceService] Clearing resources`,
        });
        this.resources = [];
        this.validationErrors = [];
        this.resourceLoaded = false;
        this.emit("resourcesCleared");
    }

    getAllResources(): ResourceList {
        return this.resources;
    }

    findResourceById(id: string): RuntimeResourceBase<ResourceType> | undefined {
        return this.resources.find(r => r.id === id);
    }


}

export const blueprintResourceService = new BlueprintResourceService();
