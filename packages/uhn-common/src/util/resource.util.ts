import { ResourceType } from "@uhn/blueprint";
import { ResourceList, RuntimeResourceBase } from "../types/worker.type";
import { RuntimeResourceState } from "../types/runtime.type";


export function makeAddressKey(resource: Pick<RuntimeResourceBase<ResourceType>, "edge" | "device" | "type" | "pin">): string | undefined {
    if (resource.edge && resource.device && resource.type && resource.pin !== undefined) {
        return `${resource.edge}:${resource.device}:${resource.type}:${resource.pin}`;
    }
    if (resource.edge && resource.device && resource.type) {
        return `${resource.edge}:${resource.device}:${resource.type}`;
    }
    if (resource.edge && resource.device) {
        return `${resource.edge}:${resource.device}`;
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
    resources: ResourceList
): ResourceList {
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