import { RuntimeLocationItem, RuntimeResource, RuntimeScene } from "@uhn/common";
import React from "react";
import { TileRuntimeResourceState } from "../../resource/resource-ui.type";
import { ViewWithState } from "../../view/viewSelectors";
import { LocationTile } from "./LocationTile";

export type LocationItemTileProps = {
    item: RuntimeLocationItem;
    viewsById: Record<string, ViewWithState>;
    resourceById: Record<string, RuntimeResource>;
    stateById: Record<string, TileRuntimeResourceState>;
    scenesById: Record<string, RuntimeScene>;
};

export const LocationItemTile: React.FC<LocationItemTileProps> = ({ item, viewsById, resourceById, stateById, scenesById }) => {
    if (item.kind === "view") {
        const vws = viewsById[item.refId];
        if (!vws) return null;
        return <LocationTile kind="view" view={vws.view} active={vws.active}
            stateDisplayValues={vws.stateDisplayValues} nameOverride={item.name} />;
    }

    if (item.kind === "resource") {
        const resource = resourceById[item.refId];
        if (!resource) return null;
        const state = stateById[item.refId];
        return <LocationTile kind="resource" resource={resource} state={state}
            nameOverride={item.name} />;
    }

    if (item.kind === "scene") {
        const scene = scenesById[item.refId];
        if (!scene) return null;
        return <LocationTile kind="scene" scene={scene} nameOverride={item.name} />;
    }

    return null;
};
