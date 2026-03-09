import { TileRuntimeResource, TileRuntimeResourceState } from "./resource-ui.type";

/** Determines if a resource is active based on its current state value.
 *  - Analog outputs: active when value > min (i.e. not at minimum/off position)
 *  - Complex resources with inactiveValue: active when value !== inactiveValue
 *  - All others: boolean truthiness (false/0/undefined/null → inactive) */
export function isResourceActive(
    resource: TileRuntimeResource,
    state?: TileRuntimeResourceState,
): boolean {
    const value = state?.value;
    if (value == null) return false;
    if (resource.min != null && typeof value === "number") return value > resource.min;
    if (resource.inactiveValue != null) return value !== resource.inactiveValue;
    return Boolean(value);
}
