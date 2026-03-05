// services/runtime-resource.service.ts
import { ComplexComputeFn, ComplexResourceBase, ComplexSubResourceRef, ResourceBase, ResourceType } from "@uhn/blueprint";
import { humanizeResourceId, isRuntimeResourceObject, RuntimeComplexResource, RuntimeComplexSubResourceRef, RuntimeResource, RuntimeResourceList } from "@uhn/common";
import fs from "fs-extra";
import path from "path";
import { runtimeOutput } from "../io/runtime-output";

/** Extracted compute config — kept in-process (not serialized for IPC) */
export type ComplexComputeEntry = {
    complexResourceId: string;
    fn: ComplexComputeFn;
    resources: ResourceBase<ResourceType>[];
};


/** Serialize blueprint ComplexSubResourceRef (resource objects) → runtime (string IDs) */
function serializeSubResources(refs: ComplexSubResourceRef[]): RuntimeComplexSubResourceRef[] {
    return refs.map(ref => ({
        resourceId: ref.resource.id!,
        label: ref.label,
        group: ref.group,
    }));
}


type CollectResult = {
    resources: RuntimeResourceList;
    complexComputeEntries: ComplexComputeEntry[];
};

async function collectResources(resourcesDir: string): Promise<CollectResult> {
    const allResources: RuntimeResourceList = [];
    const complexComputeEntries: ComplexComputeEntry[] = [];

    if (!(await fs.pathExists(resourcesDir))) {
        console.error(`ERROR: resources directory not found: ${resourcesDir}`);
        return { resources: [], complexComputeEntries: [] };
    }

    async function walk(dir: string) {
        const entries = await fs.readdir(dir);

        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const stat = await fs.stat(fullPath);

            if (stat.isDirectory()) {
                await walk(fullPath);
                continue;
            }

            if (!stat.isFile() || !entry.endsWith(".js")) continue;

            const mod = require(fullPath);

            for (const [exportName, resource] of Object.entries(mod)) {
                if (isRuntimeResourceObject(resource)) {
                    let runtimeResource = {
                        ...resource,
                        name: humanizeResourceId(resource.id),
                    } satisfies RuntimeResource;
                    // Serialize complex resource fields: resource objects → string IDs
                    if (runtimeResource.type === "complex") {
                        const complex = runtimeResource as unknown as ComplexResourceBase;
                        if (typeof complex.computeFn === "function") {
                            complexComputeEntries.push({
                                complexResourceId: runtimeResource.id,
                                fn: complex.computeFn,
                                resources: complex.computeResources ?? [],
                            });
                        }
                        const complexRuntime = {
                            ...runtimeResource,
                            type: "complex",
                            subResources: serializeSubResources(complex.subResources ?? []),
                            unit: complex.unit,
                            inactiveValue: complex.inactiveValue,
                            emitsTap: complex.emitsTap,
                        } satisfies RuntimeComplexResource;
                        runtimeResource = complexRuntime;
                    }
                    allResources.push(runtimeResource);
                } else {
                    console.warn(
                        `[rule-runtime] Skipped non-resource export "${exportName}" in "${fullPath}"`
                    );
                }
            }
        }
    }

    await walk(resourcesDir);
    return { resources: allResources, complexComputeEntries };
}

export class RuntimeResourceService {
    readonly complexComputeEntries: ComplexComputeEntry[];
    private readonly resources: RuntimeResourceList;
    private readonly resourceById: Map<string, RuntimeResource>;

    private constructor(
        resources: RuntimeResourceList,
        resourceById: Map<string, RuntimeResource>,
        complexComputeEntries: ComplexComputeEntry[]
    ) {
        this.resources = resources;
        this.resourceById = resourceById;
        this.complexComputeEntries = complexComputeEntries;
    }

    static async create(resourcesDir: string): Promise<RuntimeResourceService> {
        const { resources, complexComputeEntries } = await collectResources(resourcesDir);

        const resourceById = new Map<string, RuntimeResource>();
        for (const r of resources) {
            resourceById.set(r.id, r);
        }
        runtimeOutput.log({ level: "info", component: "RuntimeResourceService", message: `Loaded ${resources.length} resources.` });
        if (complexComputeEntries.length) {
            runtimeOutput.log({ level: "info", component: "RuntimeResourceService", message: `Found ${complexComputeEntries.length} complex compute entry/entries.` });
        }
        return new RuntimeResourceService(resources, resourceById, complexComputeEntries);
    }

    list(): RuntimeResourceList {
        return this.resources;
    }

    getById(resourceId: string): RuntimeResource | undefined {
        return this.resourceById.get(resourceId);
    }
}
