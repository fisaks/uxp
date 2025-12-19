import { ResourceBase, ResourceType } from "@uhn/blueprint";
import { ResourceErrorCode, RuntimeResourceBase } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { blueprintRuntimeService } from "./blueprint-runtime.service";
import { workerService } from "./worker.service";
import { BlueprintFileUtil } from "../util/blueprint-file.util";

type ResourceList = RuntimeResourceBase<ResourceType>[];
type ResourceValidationError = {
    type: ResourceErrorCode;
    resourceId?: string;
    conflictingId?: string;
    details?: string;
};

class BlueprintResourceService extends EventEmitter {
    private resources: ResourceList = [];
    private loading = false;
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
    }

    async reloadResources() {
        if (this.loading) return;
        this.loading = true;
        try {
            const resp = await workerService.runCommand({
                cmd: "listResources",
            });

            const resources = resp.resources ?? [];
            this.resources = this.validateResources(resources);


            AppLogger.isDebugLevel() && AppLogger.debug({
                message: `[BlueprintResourceService] Loaded resources`,
                object: { resources: this.resources }

            });
            this.emit("resourcesReloaded", this.resources);
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
        } finally {
            this.loading = false;
        }
        await this.writeResourcesToFile();
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
        this.validationErrors = [];
        const idMap = new Map<string, RuntimeResourceBase<ResourceType>>();
        const addressMap = new Map<string, RuntimeResourceBase<ResourceType>>();
        const getAddressKey = (resource: Pick<RuntimeResourceBase<ResourceType>, "edge" | "device" | "pin"|"type">): string | undefined => {
            if (resource.edge !== undefined && resource.device !== undefined && resource.pin !== undefined) {
                return `${resource.edge}:${resource.device}:${resource.type}:${resource.pin}`;
            }
            if (resource.edge !== undefined && resource.device !== undefined) {
                return `${resource.edge}:${resource.device}:${resource.type}`;
            }
            return undefined;
        }
        for (const resource of resources) {
            resource.errors = []; // ensure it's always present

            // 1. Missing ID check
            if (!resource.id) {
                this.validationErrors.push({
                    type: "missing-id",
                    resourceId: undefined,
                    details: `Resource "${resource.name ?? "[unnamed]"}" is missing an 'id' field.`,
                });
                resource.errors.push("missing-id");
                continue; // Skip further checks if no id
            }

            // 2. Duplicate ID check
            if (idMap.has(resource.id)) {
                const conflict = idMap.get(resource.id)!;
                this.validationErrors.push({
                    type: "duplicate-id",
                    resourceId: resource.id,
                    conflictingId: conflict.id,
                    details: `Duplicate resource ID '${resource.id}' in resources: ${conflict.name ?? conflict.id}, ${resource.name ?? resource.id}`,
                });
                resource.errors.push("duplicate-id");
                continue;
            }
            idMap.set(resource.id, resource);

            // 3. Duplicate physical address check
            const addrKey = getAddressKey(resource);
            if (addrKey) {
                if (addressMap.has(addrKey)) {
                    const conflict = addressMap.get(addrKey)!;
                    this.validationErrors.push({
                        type: "duplicate-address",
                        resourceId: resource.id,
                        conflictingId: conflict.id,
                        details: `Duplicate address (${addrKey}) for resources: ${conflict.name ?? conflict.id}, ${resource.name ?? resource.id}`,
                    });
                    resource.errors.push("duplicate-address");
                    continue;
                }
                addressMap.set(addrKey, resource);
            }
        }
        return [...resources];
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
        this.emit("resourcesCleared");
    }

    getAllResources(): ResourceList {
        return this.resources;
    }

    findResourceById(id: string): ResourceBase<ResourceType> | undefined {
        return this.resources.find(r => r.id === id);
    }


}

export const blueprintResourceService = new BlueprintResourceService();
