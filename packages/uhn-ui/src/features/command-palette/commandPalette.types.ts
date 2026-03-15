import { BlueprintIcon } from "@uhn/blueprint";
import { LocationItemRef, UhnResourceCommand } from "@uhn/common";

export type QuickActionId = "expand-all" | "collapse-all" | "refresh" | "scroll-to-top" | "clear-filter";

export type PaletteAction =
    | { type: "navigate"; to: string }
    | { type: "send-command"; resourceId: string; command: UhnResourceCommand }
    | { type: "execute-scene"; sceneId: string }
    | { type: "scroll-to-location"; locationId: string }
    | { type: "scroll-to-item"; locationId: string; itemRef: LocationItemRef }
    | { type: "open-analog-popup"; resourceId: string; command: UhnResourceCommand; min: number; max: number; step?: number; unit?: string; label: string }
    | { type: "filter-grid"; term: string }
    | { type: "open-system-panel" }
    | { type: "quick-action"; action: QuickActionId };

export type PaletteGroup = "Filter" | "Locations" | "Items" | "Actions" | "Quick Actions" | "Navigation";

export type PaletteItem = {
    id: string;
    label: string;
    secondary?: string;
    icon?: BlueprintIcon;
    group: PaletteGroup;
    action: PaletteAction;
    searchText: string;
    active?: boolean;
    /** Marks analog "set" actions that should open the slider popup when no number is in the query. */
    analogFallback?: boolean;
};
