import { RuntimeLocation } from "@uhn/common";
import { useMemo } from "react";

/**
 * Merges blueprint locations with a saved section order.
 * - Saved location IDs appear first (if still present in blueprint)
 * - New blueprint locations (not in saved order) are appended at the end
 * - Stale saved IDs (no longer in blueprint) are silently dropped
 */
export function useOrderedLocations(
    locations: RuntimeLocation[],
    savedOrder: string[] | undefined,
): RuntimeLocation[] {
    return useMemo(() => {
        if (!savedOrder || savedOrder.length === 0) return locations;

        const locationMap = new Map<string, RuntimeLocation>();
        for (const loc of locations) {
            locationMap.set(loc.id, loc);
        }

        const ordered: RuntimeLocation[] = [];
        const seen = new Set<string>();

        for (const id of savedOrder) {
            const loc = locationMap.get(id);
            if (loc) {
                ordered.push(loc);
                seen.add(id);
            }
        }

        for (const loc of locations) {
            if (!seen.has(loc.id)) {
                ordered.push(loc);
            }
        }

        return ordered;
    }, [locations, savedOrder]);
}
