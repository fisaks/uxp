import type { DevFilter } from "@uhn/blueprint";
import type { RuntimeComplexResource, RuntimeResourceList } from "@uhn/common";
import fs from "fs-extra";
import path from "path";
import { runtimeOutput } from "./io/runtime-output";
import type { RuntimeLocationService } from "./services/runtime-location.service";
import type { RuntimeResourceService } from "./services/runtime-resource.service";
import type { RuntimeRulesService } from "./services/runtime-rules.service";
import type { RuntimeSceneService } from "./services/runtime-scene.service";
import type { RuntimeViewService } from "./services/runtime-view.service";

type Services = {
    resourceService: RuntimeResourceService;
    rulesService: RuntimeRulesService;
    viewService: RuntimeViewService;
    locationService: RuntimeLocationService;
    sceneService: RuntimeSceneService;
};

/**
 * Load dev filter from blueprint (if present) and apply it to all services in-place.
 * No-op if dist/dev-filters/dev-filter.js doesn't exist.
 */
export async function loadAndApplyDevFilter(blueprintRoot: string, services: Services): Promise<void> {
    const devFilterPath = path.join(blueprintRoot, "dist", "dev-filters", "dev-filter.js");
    if (!await fs.pathExists(devFilterPath)) return;

    const devFilterModule = require(devFilterPath);
    const devFilter = devFilterModule.default ?? devFilterModule;

    if (!isDevFilter(devFilter)) {
        runtimeOutput.log({
            level: "error",
            component: "DevFilter",
            message: "Dev filter module does not export a valid DevFilter (missing 'name' field)",
        });
        return;
    }

    const { resourceIds, viewIds, ruleIds, sceneIds } = collectIds(devFilter, services.resourceService);

    services.resourceService.filterByIds(resourceIds);
    services.rulesService.filterByIds(ruleIds);
    services.viewService.filterByIds(viewIds);
    services.sceneService.filterByIds(sceneIds);
    const locationItemKeys = new Set<string>();
    for (const id of resourceIds) locationItemKeys.add(`resource:${id}`);
    for (const id of viewIds) locationItemKeys.add(`view:${id}`);
    for (const id of sceneIds) locationItemKeys.add(`scene:${id}`);
    services.locationService.filterByLocationItems(locationItemKeys);

    logSummary(devFilter.name, services);
}

function isDevFilter(obj: unknown): obj is DevFilter {
    return typeof obj === "object" && obj !== null && typeof (obj as any).name === "string";
}

/** Extract all IDs that should survive the filter. */
function collectIds(filter: DevFilter, resourceService: RuntimeResourceService) {
    const viewIds = new Set(filter.views?.map(v => v.id!) ?? []);
    const ruleIds = new Set(filter.rules?.map(r => r.id) ?? []);
    const sceneIds = new Set(filter.scenes?.map(s => s.id!) ?? []);
    const resourceIds = new Set<string>();

    collectResourceIdsFromFilter(filter, resourceIds);
    expandComplexDependencies(resourceIds, resourceService);

    return { resourceIds, viewIds, ruleIds, sceneIds };
}

/** Walk all typed filter objects and collect the resource IDs they reference. */
function collectResourceIdsFromFilter(filter: DevFilter, ids: Set<string>): void {
    const add = (id: string | undefined) => { if (id) ids.add(id); };

    for (const v of filter.views ?? []) {
        for (const sf of v.stateFrom) add(sf.resource.id);
        add(v.command?.resource.id);
        add(v.command?.onDeactivate?.resource.id);
        for (const c of v.controls ?? []) add(c.resource.id);
        if (v.stateDisplay) {
            const sd = v.stateDisplay;
            for (const arr of [sd.topLeft, sd.topCenter, sd.topRight, sd.badge, sd.left, sd.right, sd.hero]) {
                for (const item of arr ?? []) add(item.resource.id);
            }
        }
        for (const se of v.sideEffects ?? []) add(se.resource.id);
    }

    for (const r of filter.rules ?? []) {
        for (const t of r.triggers) add(t.resource?.id);
        for (const ah of r.actionHints ?? []) add(ah.id);
    }

    for (const s of filter.scenes ?? []) {
        for (const cmd of s.commands) add(cmd.resource.id);
    }

    for (const r of filter.extraResources ?? []) add(r.id);
}

/**
 * Expand complex resource dependencies: subResources and computeResources.
 * Uses a work queue instead of repeated full scans to avoid infinite loops
 * on circular references.
 */
function expandComplexDependencies(ids: Set<string>, resourceService: RuntimeResourceService): void {
    const queue = [...ids];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const id = queue.pop()!;
        if (visited.has(id)) continue;
        visited.add(id);

        const r = resourceService.getById(id);
        if (!r || r.type !== "complex") continue;

        const complex = r as RuntimeComplexResource;
        for (const sub of complex.subResources) {
            if (!ids.has(sub.resourceId)) {
                ids.add(sub.resourceId);
                queue.push(sub.resourceId);
            }
        }
    }

    // computeResources are live blueprint objects on ComplexComputeEntry, not on RuntimeResource.
    // Add them so the edge subscribes and state arrives for the computeFn.
    for (const entry of resourceService.complexComputeEntries) {
        if (!ids.has(entry.complexResourceId)) continue;
        for (const res of entry.resources) {
            if (res.id) ids.add(res.id);
        }
    }
}

function logSummary(name: string, services: Services): void {
    const { resourceService, rulesService, viewService, sceneService, locationService } = services;
    runtimeOutput.log({
        level: "info",
        component: "DevFilter",
        message: `Dev filter "${name}": ${resourceService.list().length} resources, ${viewService.list().length} views, ${rulesService.list().length} rules, ${sceneService.list().length} scenes, ${locationService.list().length} locations`,
    });
}
