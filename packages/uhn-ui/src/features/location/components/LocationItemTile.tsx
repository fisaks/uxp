import { RuntimeLocationItem, RuntimeResource, RuntimeScene } from "@uhn/common";
import { Box } from "@mui/material";
import React from "react";
import { FavoriteStarButton } from "../../favorite/components/FavoriteStarButton";
import { TileRuntimeResourceState } from "../../resource/resource-ui.type";
import { ViewWithState } from "../../view/viewSelectors";
import { LocationTile } from "./LocationTile";
import { StaleTile } from "./StaleTile";

export type LocationItemTileProps = {
    item: RuntimeLocationItem;
    viewsById: Record<string, ViewWithState>;
    resourceById: Record<string, RuntimeResource>;
    stateById: Record<string, TileRuntimeResourceState>;
    scenesById: Record<string, RuntimeScene>;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
};

export const LocationItemTile: React.FC<LocationItemTileProps> = ({
    item, viewsById, resourceById, stateById, scenesById, isFavorite, onToggleFavorite,
}) => {
    return (
        <Box className="tile-wrapper" sx={{ position: "relative" }}>
            {onToggleFavorite && (
                <FavoriteStarButton isFavorite={!!isFavorite} onToggle={onToggleFavorite} />
            )}
            <ResolvedTile item={item} viewsById={viewsById} resourceById={resourceById}
                stateById={stateById} scenesById={scenesById} />
        </Box>
    );
};

type ResolvedTileProps = {
    item: RuntimeLocationItem;
    viewsById: Record<string, ViewWithState>;
    resourceById: Record<string, RuntimeResource>;
    stateById: Record<string, TileRuntimeResourceState>;
    scenesById: Record<string, RuntimeScene>;
};

const ResolvedTile: React.FC<ResolvedTileProps> = ({ item, viewsById, resourceById, stateById, scenesById }) => {
    if (item.kind === "view") {
        const vws = viewsById[item.refId];
        if (!vws) return <StaleTile />;
        return <LocationTile kind="view" view={vws.view} active={vws.active}
            stateDisplay={vws.stateDisplay} resolvedName={vws.resolvedName} nameOverride={item.name} />;
    }
    if (item.kind === "resource") {
        const resource = resourceById[item.refId];
        if (!resource) return <StaleTile />;
        const state = stateById[item.refId];
        return <LocationTile kind="resource" resource={resource} state={state}
            nameOverride={item.name} />;
    }
    if (item.kind === "scene") {
        const scene = scenesById[item.refId];
        if (!scene) return <StaleTile />;
        return <LocationTile kind="scene" scene={scene} nameOverride={item.name} />;
    }
    return <StaleTile />;
};
