import { LocationItemRef, RuntimeLocationItem } from "@uhn/common";
import { useMemo } from "react";

/**
 * Merges blueprint items with a saved user order.
 * - Saved items appear first (if still present in blueprint)
 * - New blueprint items (not in saved order) are appended at the end
 * - Stale saved items (no longer in blueprint) are silently dropped
 */
export function useOrderedLocationItems(
    blueprintItems: RuntimeLocationItem[],
    savedOrder: LocationItemRef[] | undefined,
): RuntimeLocationItem[] {
    return useMemo(() => {
        if (!savedOrder || savedOrder.length === 0) return blueprintItems;

        const itemMap = new Map<string, RuntimeLocationItem>();
        for (const item of blueprintItems) {
            itemMap.set(`${item.kind}:${item.refId}`, item);
        }

        const ordered: RuntimeLocationItem[] = [];
        const seen = new Set<string>();

        for (const ref of savedOrder) {
            const key = `${ref.kind}:${ref.refId}`;
            const item = itemMap.get(key);
            if (item) {
                ordered.push(item);
                seen.add(key);
            }
        }

        // Append new blueprint items not in saved order
        for (const item of blueprintItems) {
            const key = `${item.kind}:${item.refId}`;
            if (!seen.has(key)) {
                ordered.push(item);
            }
        }

        return ordered;
    }, [blueprintItems, savedOrder]);
}
