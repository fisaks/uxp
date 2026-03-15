import { useMemo } from "react";
import { fuzzyTokenMatch } from "../shared/fuzzyMatch";
import { PaletteItem } from "./commandPalette.types";

type UseCommandPaletteFilterResult = {
    filteredItems: PaletteItem[];
};

/**
 * Parses a trailing numeric token from the query (supports negative values).
 * "dimmer 65"       → { textPart: "dimmer", numericValue: 65 }
 * "dimmer -10"      → { textPart: "dimmer", numericValue: -10 }
 * "room 2 light 40" → { textPart: "room 2 light", numericValue: 40 }
 * "room 2 light"    → no match (2 is not trailing)
 * "kitchen light"   → no match
 */
function parseTrailingNumber(query: string): { textPart: string; numericValue: number } | undefined {
    const trimmed = query.trim();
    const match = trimmed.match(/^(.+?)\s+(-?\d+(?:\.\d+)?)$/);
    if (!match) return undefined;
    const textPart = match[1].trim();
    const numericValue = parseFloat(match[2]);
    if (textPart.length === 0 || isNaN(numericValue)) return undefined;
    return { textPart, numericValue };
}

export function useCommandPaletteFilter(
    searchTerm: string,
    allItems: PaletteItem[],
): UseCommandPaletteFilterResult {
    return useMemo(() => {
        const trimmed = searchTerm.trim();
        if (!trimmed) {
            return { filteredItems: [] };
        }

        const parsed = parseTrailingNumber(trimmed);
        const parsedAnalogValue = parsed?.numericValue;
        const textForFiltering = parsed?.textPart ?? trimmed;
        const tokens = textForFiltering.toLowerCase().split(/\s+/);

        const filteredItems: PaletteItem[] = [];

        for (const item of allItems) {
            // Multi-word AND matching with fuzzy typo tolerance
            // (group name is baked into searchText by buildSearchText)
            if (!tokens.every(token => fuzzyTokenMatch(token, item.searchText))) continue;

            // For analogFallback items, resolve based on whether a number was parsed
            if (item.analogFallback && parsedAnalogValue != null) {
                // Number present → swap to send-command with parsed value
                const action = item.action;
                if (action.type === "open-analog-popup") {
                    const clampedValue = Math.min(Math.max(parsedAnalogValue, action.min), action.max);
                    filteredItems.push({
                        ...item,
                        label: `Set ${action.label} to ${clampedValue}${action.unit ? ` ${action.unit}` : "%"}`,
                        action: {
                            type: "send-command",
                            resourceId: action.resourceId,
                            command: { type: "setAnalog", value: clampedValue },
                        },
                    });
                    continue;
                }
            }

            if (item.analogFallback && parsedAnalogValue == null) {
                // No number → keep as open-analog-popup with ellipsis label
                filteredItems.push({
                    ...item,
                    label: `${item.label}...`,
                });
                continue;
            }

            filteredItems.push(item);
        }

        return { filteredItems };
    }, [searchTerm, allItems]);
}
