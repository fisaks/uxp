import { RuntimeResource, RuntimeResourceList, RuntimeResourceState } from "../types/uhn-runtime.type";

export function makeAddressKey(resource: { edge?: string; device?: string; type?: string; pin?: number | string }): string | undefined {
    if (resource.edge && resource.device && resource.type && resource.pin !== undefined) {
        return `${resource.edge}:${resource.device}:${resource.type}:${resource.pin}`;
    }
    return undefined;
}

export function resourcePatternToRegex(resourcePattern: string): RegExp {
    // Escape regex metacharacters, then turn '*' into '.*'
    const escaped = resourcePattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    const regExpPattern = escaped.replace(/\*/g, ".*");
    return new RegExp(`^${regExpPattern}$`);
}

export function resourceIdMatcher(ids: string[] | undefined): { exact: Set<string>, wildcards: RegExp[] } {
    if (!ids?.length) return { exact: new Set(), wildcards: [] };

    const exact = new Set<string>();
    const wildcards: RegExp[] = [];

    for (const id of ids) {
        if (id.includes("*")) wildcards.push(resourcePatternToRegex(id));
        else exact.add(id);
    }
    return {
        exact,
        wildcards
    }
}

export function getMatchingResourcesForPattern(
    pattern: string,
    resources: RuntimeResourceList
): RuntimeResourceList {
    if (pattern === "resource/*") {
        return resources;
    }
    if (pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1);
        return resources.filter(r => `resource/${r.id}`.startsWith(prefix));
    }
    // Exact match
    const resourceId = pattern.slice("resource/".length);
    return resources.filter(r => r.id === resourceId);
}

export function getMatchingStateForPattern(
    pattern: string,
    states: RuntimeResourceState[]
): RuntimeResourceState[] {
    if (pattern === "state/*") {
        return states;
    }
    if (pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1);
        return states.filter(s => `state/${s.resourceId}`.startsWith(prefix));
    }
    // Exact match
    const resourceId = pattern.slice("state/".length);
    return states.filter(s => s.resourceId === resourceId);
}

export function humanizeResourceId(resourceId: string): string {
    return resourceId
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^./, c => c.toUpperCase());
}

export function humanizeViewId(viewId: string): string {
    // Strip "View" suffix or "view" prefix (case-sensitive camelCase patterns)
    let id = viewId;
    if (id.endsWith("View")) id = id.slice(0, -4);
    if (id.startsWith("view")) id = id.charAt(4).toLowerCase() + id.slice(5);
    return humanizeResourceId(id);
}

export function humanizeLocationId(locationId: string): string {
    // Strip "Location" suffix or "location" prefix (case-sensitive camelCase patterns)
    let id = locationId;
    if (id.endsWith("Location")) id = id.slice(0, -8);
    if (id.startsWith("location")) id = id.charAt(8).toLowerCase() + id.slice(9);
    return humanizeResourceId(id);
}

export function humanizeSceneId(sceneId: string): string {
    // Strip "Scene" suffix or "scene" prefix (case-sensitive camelCase patterns)
    let id = sceneId;
    if (id.endsWith("Scene")) id = id.slice(0, -5);
    if (id.startsWith("scene")) id = id.charAt(5).toLowerCase() + id.slice(6);
    return humanizeResourceId(id);
}

export function isRuntimeResourceObject(obj: unknown): obj is RuntimeResource {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "type" in obj &&
        "id" in obj &&
        typeof (obj as any).type === "string" &&
        typeof (obj as any).id === "string" &&
        (("edge" in obj && typeof (obj as any).edge === "string")
         || ("host" in obj && typeof (obj as any).host === "string"))
    );
}
