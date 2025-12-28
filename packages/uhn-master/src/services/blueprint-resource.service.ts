import { makeAddressKey, ResourceErrorCode, resourceIdMatcher, ResourceValidationError, RuntimeResource, RuntimeResourceList } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { BlueprintFileUtil } from "../util/blueprint-file.util";

import { blueprintRuntimeSupervisorService } from "./blueprint-runtime-supervisor.service";
import { physicalCatalogService } from "./physical-catalog.service";
import { ruleRuntimeProcessService } from "./rule-runtime-process.service";



export type ResourceEventMap = {
    resourcesReloaded: [resources: RuntimeResourceList, validationErrors: ResourceValidationError[]];
    error: [error: unknown];
    resourcesCleared: [];
};

class BlueprintResourceService extends EventEmitter<ResourceEventMap> {
    private resources: RuntimeResourceList = [];
    private loading = false;
    private catalogChangedDuringLoad = false;
    private resourceLoaded = false;
    private validationErrors: ResourceValidationError[] = [];

    constructor() {
        super();

        blueprintRuntimeSupervisorService.on("ruleRuntimeReady", () => {
            AppLogger.info({
                message: `[BlueprintResourceService] Rule runtime is ready, loading resources.`,
            });
            this.reloadResources().catch(err => {
                AppLogger.error({
                    message: `[BlueprintResourceService] Failed to load resources on rule runtime ready:`,
                    error: err,
                });
            });
        });

        blueprintRuntimeSupervisorService.on("ruleRuntimeStopped", () => {
            AppLogger.info({
                message: `[BlueprintResourceService] Rule runtime stopped, clearing resources.`,
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
            await this.reloadResourcesFromRuleRuntime();
            if (this.catalogChangedDuringLoad) {
                this.catalogChangedDuringLoad = false;
                AppLogger.info({
                    message: `[BlueprintResourceService] Catalog changed during resource load, reloading resources again.`,
                });
                await this.reloadResourcesFromRuleRuntime();
            }
        } finally {
            this.loading = false;
        }
    }

    private async reloadResourcesFromRuleRuntime() {
        try {
            const resp = await ruleRuntimeProcessService.runCommand({
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
    private validateResources(resources: RuntimeResourceList) {
        const errors: ResourceValidationError[] = [];
        const idMap = new Map<string, RuntimeResource>();
        const addressMap = new Map<string, RuntimeResource>();
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
                    } else if ((resource.type === "digitalInput" || resource.type === "digitalOutput") && typeof resource.pin !== "number") {
                        addErr("missing-pin", `Resource '${resource.id ?? resource.name ?? "[unnamed]"}' is missing 'pin'.`);
                    }
                }
            } else {
                addErr("missing-address", `Resource '${resource.id ?? resource.name ?? "[unnamed]"}' is missing address information (edge/device).`);
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
    getInvalidResources(): RuntimeResourceList {
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

    getAllResources(): RuntimeResourceList {
        return this.resources;
    }

    findResourceById(id: string): RuntimeResource | undefined {
        return this.resources.find(r => r.id === id);
    }

    findResourcesByIds(ids: string[] | undefined): RuntimeResourceList {
        if (!ids || ids.length === 0) {
            return [];
        }
        const { exact, wildcards } = resourceIdMatcher(ids);
        return this.resources.filter(r => {
            if (!r.id) return false;
            if (exact.has(r.id)) return true;
            return wildcards.some(rx => rx.test(r.id!));
        });
    }

}

export const blueprintResourceService = new BlueprintResourceService();
