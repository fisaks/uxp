// services/runtime-resource.service.ts
import { humanizeResourceId, isRuntimeResourceObject, RuntimeResource, RuntimeResourceList } from "@uhn/common";
import fs from "fs-extra";
import path from "path";
import { stdoutWriter } from "../io/stdout-writer";

async function collectResources(resourcesDir: string): Promise<RuntimeResourceList> {
    const allResources: RuntimeResourceList = [];
    
    if (!(await fs.pathExists(resourcesDir))) {
        console.error(`ERROR: resources directory not found: ${resourcesDir}`);
        return [];
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
                    allResources.push({
                        ...resource,
                        name: humanizeResourceId(resource.id),
                    });
                } else {
                    console.warn(
                        `[rule-runtime] Skipped non-resource export "${exportName}" in "${fullPath}"`
                    );
                }
            }
        }
    }

    await walk(resourcesDir);
    return allResources;
}

export class RuntimeResourceService {
    private readonly resources: RuntimeResourceList;
    private readonly resourceById: Map<string, RuntimeResource>;

    private constructor(
        resources: RuntimeResourceList,
        resourceById: Map<string, RuntimeResource>
    ) {
        this.resources = resources;
        this.resourceById = resourceById;
    }

    static async create(resourcesDir: string): Promise<RuntimeResourceService> {
        const resources = await collectResources(resourcesDir);

        const resourceById = new Map<string, RuntimeResource>();
        for (const r of resources) {
            resourceById.set(r.id, r);
        }
        stdoutWriter.log({ level: "info", component: "RuntimeResourceService", message: `Loaded ${resources.length} resources.` });
        return new RuntimeResourceService(resources, resourceById);
    }

    list(): RuntimeResourceList {
        return this.resources;
    }

    getById(resourceId: string): RuntimeResource | undefined {
        return this.resourceById.get(resourceId);
    }
}
