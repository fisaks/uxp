import { createSelector } from "@reduxjs/toolkit";
import { RuntimeLocation } from "@uhn/common";
import { RootState } from "../../app/store";
import { selectResourceById } from "../resource/resourceSelector";
import { selectScenesById } from "../scene/sceneSelectors";
import { selectViewsById } from "../view/viewSelectors";

const selectLocationState = (state: RootState) => state.locations;

export const selectAllLocations = createSelector(
    [selectLocationState],
    (locations): RuntimeLocation[] => locations.allIds.map(id => locations.byId[id])
);

export const selectLocationsLoaded = createSelector(
    [selectLocationState],
    (locations): boolean => locations.isLoaded
);

export const selectLocationById = createSelector(
    [selectLocationState, (_state: RootState, locationId: string) => locationId],
    (locations, locationId): RuntimeLocation | undefined => locations.byId[locationId]
);

/**
 * Precomputed lowercase search text for every location item (key: "kind:refId").
 * Combines name, refId, description, and keywords from the item's backing entity.
 * Recomputes only when locations, views, resources, or scenes change — not on every keystroke.
 */
export const selectItemSearchTextMap = createSelector(
    [selectAllLocations, selectViewsById, selectResourceById, selectScenesById],
    (locations, viewsById, resourceById, scenesById): Record<string, string> => {
        const map: Record<string, string> = {};
        for (const loc of locations) {
            for (const item of loc.items) {
                const key = `${item.kind}:${item.refId}`;
                if (map[key]) continue;
                const name = item.name ?? "";
                const refId = item.refId;
                let description = "";
                let keywords = "";
                if (item.kind === "view") {
                    const v = viewsById[item.refId];
                    description = v?.description ?? "";
                    keywords = v?.keywords?.join(" ") ?? "";
                } else if (item.kind === "resource") {
                    const r = resourceById[item.refId];
                    description = r?.description ?? "";
                    keywords = r?.keywords?.join(" ") ?? "";
                } else if (item.kind === "scene") {
                    const s = scenesById[item.refId];
                    description = s?.description ?? "";
                    keywords = s?.keywords?.join(" ") ?? "";
                }
                map[key] = `${name} ${refId} ${description} ${keywords}`.toLowerCase();
            }
        }
        return map;
    }
);
