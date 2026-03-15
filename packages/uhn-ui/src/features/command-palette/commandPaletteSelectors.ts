import { createSelector } from "@reduxjs/toolkit";
import { RuntimeInteractionView, RuntimeLocation, RuntimeResource, RuntimeScene, UhnResourceCommand } from "@uhn/common";
import { favoriteApi } from "../favorite/favorite.api";
import { LOCATION_FAVORITES } from "../favorite/components/FavoritesSection";
import { selectAllLocations } from "../location/locationSelectors";
import { selectResourceById } from "../resource/resourceSelector";
import { selectRuntimeStateByResourceId } from "../runtime-state/runtimeStateSelector";
import { selectScenesById } from "../scene/sceneSelectors";
import { ViewWithState, selectViewsWithStateById } from "../view/viewSelectors";
import { PaletteGroup, PaletteItem } from "./commandPalette.types";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function buildSearchText(group: PaletteGroup, locationName: string, itemName: string, id: string, description?: string, verb?: string, keywords?: string[]): string {
    const parts = verb ? [verb, group, locationName, itemName, id] : [group, locationName, itemName, id];
    if (description) parts.push(description);
    if (keywords?.length) parts.push(...keywords);
    return parts.join(" ").toLowerCase();
}

/* ------------------------------------------------------------------ */
/* View action generation                                              */
/* ------------------------------------------------------------------ */

function buildViewActions(
    vws: ViewWithState,
    location: RuntimeLocation,
    locationName: string,
): PaletteItem[] {
    const { view, active } = vws;
    const cmd = view.command;
    if (!cmd) return [];

    const itemName = view.name;
    const icon = view.icon;
    const group: PaletteGroup = "Actions";
    const desc = view.description;
    const kw = view.keywords;

    switch (cmd.type) {
        case "tap":
        case "toggle":
        case "longPress": {
            // State-based labels: "Turn on" when inactive, "Turn off" when active
            const command: UhnResourceCommand = cmd.type === "tap"
                ? { type: "tap" }
                : cmd.type === "toggle"
                    ? { type: "toggle" }
                    : { type: "longPress", holdMs: cmd.holdMs ?? 1000 };
            const resourceId = cmd.resourceId;

            // Use onDeactivate target if active and available
            const deactivateTarget = active && cmd.onDeactivate ? cmd.onDeactivate : undefined;
            const deactivateCommand: UhnResourceCommand | undefined = deactivateTarget
                ? deactivateTarget.type === "tap" ? { type: "tap" }
                    : deactivateTarget.type === "toggle" ? { type: "toggle" }
                        : deactivateTarget.type === "longPress" ? { type: "longPress", holdMs: deactivateTarget.holdMs ?? 1000 }
                            : deactivateTarget.type === "setAnalog" ? { type: "setAnalog", value: deactivateTarget.min ?? 0 }
                                : deactivateTarget.type === "clearTimer" ? { type: "clearTimer" }
                                    : undefined
                : undefined;

            // Single state-based action; searchText includes both on/off aliases
            return [{
                id: `action:toggle:view:${view.id}:${location.id}`,
                label: active ? `Turn off ${itemName}` : `Turn on ${itemName}`,
                secondary: locationName,
                icon, group, active,
                searchText: buildSearchText(group, locationName, itemName, view.id, desc, "turn on off toggle switch", kw),
                action: {
                    type: "send-command",
                    resourceId: active ? (deactivateTarget?.resourceId ?? resourceId) : resourceId,
                    command: active ? (deactivateCommand ?? command) : command,
                },
            }];
        }

        case "setAnalog": {
            const resourceId = cmd.resourceId;
            const min = cmd.min ?? 0;
            const max = cmd.max ?? 100;
            const step = cmd.step ?? 1;
            const unit = cmd.unit;
            const defaultOnValue = cmd.defaultOnValue;
            const items: PaletteItem[] = [];

            // Single state-based toggle action; searchText includes both on/off aliases
            items.push({
                id: `action:toggle:view:${view.id}:${location.id}`,
                label: active ? `Turn off ${itemName}` : `Turn on ${itemName}`,
                secondary: locationName,
                icon, group, active,
                searchText: buildSearchText(group, locationName, itemName, view.id, desc, "turn on off toggle switch", kw),
                action: {
                    type: "send-command", resourceId,
                    command: { type: "setAnalog", value: active ? min : (defaultOnValue ?? max) },
                },
            });
            // Set to N% (analog fallback — resolved at filter time)
            items.push({
                id: `action:set:view:${view.id}:${location.id}`,
                label: `Set ${itemName}`,
                secondary: locationName,
                icon, group, active,
                searchText: buildSearchText(group, locationName, itemName, view.id, desc, "set adjust dim", kw),
                analogFallback: true,
                action: {
                    type: "open-analog-popup", resourceId,
                    command: { type: "setAnalog", value: 0 },
                    min, max, step, unit, label: itemName,
                },
            });
            return items;
        }

        case "clearTimer": {
            return [{
                id: `action:clear:view:${view.id}:${location.id}`,
                label: `Clear ${itemName}`,
                secondary: locationName,
                icon, group, active,
                searchText: buildSearchText(group, locationName, itemName, view.id, desc, "clear reset timer", kw),
                action: { type: "send-command", resourceId: cmd.resourceId, command: { type: "clearTimer" } },
            }];
        }
    }

    return [];
}

/* ------------------------------------------------------------------ */
/* Raw resource action generation                                      */
/* ------------------------------------------------------------------ */

function buildRawResourceActions(
    resource: RuntimeResource,
    location: RuntimeLocation,
    locationName: string,
    stateValue: boolean | number | undefined,
): PaletteItem[] {
    const itemName = resource.name;
    const desc = resource.description;
    const kw = resource.keywords;
    const icon = resource.icon;
    const group: PaletteGroup = "Actions";
    const active = stateValue != null && stateValue !== false && stateValue !== 0;

    if (resource.type === "digitalOutput") {
        // Single state-based action; searchText includes both on/off aliases
        return [{
            id: `action:toggle:resource:${resource.id}:${location.id}`,
            label: active ? `Turn off ${itemName}` : `Turn on ${itemName}`,
            secondary: locationName,
            icon, group, active,
            searchText: buildSearchText(group, locationName, itemName, resource.id, desc, "turn on off toggle switch", kw),
            action: { type: "send-command", resourceId: resource.id, command: { type: "set", value: !active } },
        }];
    }

    if (resource.type === "analogOutput" || resource.type === "virtualAnalogOutput") {
        const r = resource as RuntimeResource & { min?: number; max?: number; step?: number; unit?: string; defaultOnValue?: number };
        const min = r.min ?? 0;
        const max = r.max ?? 100;
        const step = r.step ?? 1;
        const unit = r.unit;
        const defaultOnValue = r.defaultOnValue;

        // Single state-based toggle + analog set entry
        return [
            {
                id: `action:toggle:resource:${resource.id}:${location.id}`,
                label: active ? `Turn off ${itemName}` : `Turn on ${itemName}`,
                secondary: locationName,
                icon, group, active,
                searchText: buildSearchText(group, locationName, itemName, resource.id, desc, "turn on off toggle switch", kw),
                action: {
                    type: "send-command", resourceId: resource.id,
                    command: { type: "setAnalog", value: active ? min : (defaultOnValue ?? max) },
                },
            },
            {
                id: `action:set:resource:${resource.id}:${location.id}`,
                label: `Set ${itemName}`,
                secondary: locationName,
                icon, group, active,
                searchText: buildSearchText(group, locationName, itemName, resource.id, desc, "set adjust dim", kw),
                analogFallback: true,
                action: {
                    type: "open-analog-popup", resourceId: resource.id,
                    command: { type: "setAnalog", value: 0 },
                    min, max, step, unit, label: itemName,
                },
            },
        ];
    }

    return [];
}

/* ------------------------------------------------------------------ */
/* Scene action generation                                             */
/* ------------------------------------------------------------------ */

function buildSceneActions(
    scene: RuntimeScene,
    location: RuntimeLocation,
    locationName: string,
): PaletteItem[] {
    return [{
        id: `action:scene:${scene.id}:${location.id}`,
        label: `Activate scene ${scene.name}`,
        secondary: locationName,
        icon: scene.icon,
        group: "Actions",
        searchText: buildSearchText("Actions", locationName, scene.name, scene.id, scene.description, "activate run trigger scene", scene.keywords),
        action: { type: "execute-scene", sceneId: scene.id },
    }];
}

/* ------------------------------------------------------------------ */
/* Main selector                                                       */
/* ------------------------------------------------------------------ */

const selectFavoritesData = favoriteApi.endpoints.fetchFavorites.select();

export const selectCommandPaletteItems = createSelector(
    [selectAllLocations, selectViewsWithStateById, selectResourceById, selectScenesById, selectRuntimeStateByResourceId, selectFavoritesData],
    (locations, viewsById, resourceById, scenesById, stateByResourceId, favoritesResult): PaletteItem[] => {
        const items: PaletteItem[] = [];
        const locationItemsSeen = new Set<string>();

        // Favorites section — navigates to home and expands favorites
        if (favoritesResult.data?.length) {
            items.push({
                id: `location:${LOCATION_FAVORITES}`,
                label: "Favorites",
                icon: "status:favorite",
                group: "Locations",
                searchText: "locations favorites starred bookmarks saved",
                action: { type: "scroll-to-location", locationId: LOCATION_FAVORITES },
            });
        }

        for (const location of locations) {
            const locationName = location.name ?? location.id;

            // Location entry — lets users scroll to a section
            items.push({
                id: `location:${location.id}`,
                label: locationName,
                icon: location.icon,
                group: "Locations",
                searchText: buildSearchText("Locations", "", locationName, location.id, location.description, undefined, location.keywords),
                action: { type: "scroll-to-location", locationId: location.id },
            });

            for (const locItem of location.items) {
                const dedupeKey = `${locItem.kind}:${locItem.refId}`;

                if (locItem.kind === "view") {
                    const vws = viewsById[locItem.refId];
                    if (!vws) continue;

                    // Item entry (deduplicated)
                    if (!locationItemsSeen.has(dedupeKey)) {
                        locationItemsSeen.add(dedupeKey);
                        items.push({
                            id: `item:view:${vws.view.id}:${location.id}`,
                            label: vws.view.name,
                            secondary: locationName,
                            icon: vws.view.icon,
                            group: "Items",
                            searchText: buildSearchText("Items", locationName, vws.view.name, vws.view.id, vws.view.description, undefined, vws.view.keywords),
                            active: vws.active,
                            action: { type: "scroll-to-item", locationId: location.id, itemRef: { kind: "view", refId: vws.view.id } },
                        });
                    }

                    // Action entries
                    items.push(...buildViewActions(vws, location, locationName));
                }

                if (locItem.kind === "resource") {
                    const resource = resourceById[locItem.refId];
                    if (!resource) continue;

                    const stateEntry = stateByResourceId[resource.id];
                    const stateValue = stateEntry?.value;
                    const active = stateValue != null && stateValue !== false && stateValue !== 0;

                    // Item entry (deduplicated)
                    if (!locationItemsSeen.has(dedupeKey)) {
                        locationItemsSeen.add(dedupeKey);
                        items.push({
                            id: `item:resource:${resource.id}:${location.id}`,
                            label: resource.name,
                            secondary: locationName,
                            icon: resource.icon,
                            group: "Items",
                            searchText: buildSearchText("Items", locationName, resource.name, resource.id, resource.description, undefined, resource.keywords),
                            active,
                            action: { type: "scroll-to-item", locationId: location.id, itemRef: { kind: "resource", refId: resource.id } },
                        });
                    }

                    // Action entries
                    items.push(...buildRawResourceActions(resource, location, locationName, stateValue));
                }

                if (locItem.kind === "scene") {
                    const scene = scenesById[locItem.refId];
                    if (!scene) continue;

                    // Item entry (deduplicated)
                    if (!locationItemsSeen.has(dedupeKey)) {
                        locationItemsSeen.add(dedupeKey);
                        items.push({
                            id: `item:scene:${scene.id}:${location.id}`,
                            label: scene.name,
                            secondary: locationName,
                            icon: scene.icon,
                            group: "Items",
                            searchText: buildSearchText("Items", locationName, scene.name, scene.id, scene.description, undefined, scene.keywords),
                            action: { type: "scroll-to-item", locationId: location.id, itemRef: { kind: "scene", refId: scene.id } },
                        });
                    }

                    // Action entries
                    items.push(...buildSceneActions(scene, location, locationName));
                }
            }
        }

        return items;
    }
);
