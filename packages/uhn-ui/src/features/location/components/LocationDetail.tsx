import { Grid2, Typography } from "@mui/material";
import { RuntimeLocation, RuntimeLocationItem, RuntimeResource, RuntimeScene } from "@uhn/common";
import React from "react";
import { useSelector } from "react-redux";
import { TileRuntimeResourceState } from "../../resource/resource-ui.type";
import { selectResourceById } from "../../resource/resourceSelector";
import { selectRuntimeStateByResourceId } from "../../runtime-state/runtimeStateSelector";
import { selectScenesById } from "../../scene/sceneSelectors";
import { selectViewsWithStateById, ViewWithState } from "../../view/viewSelectors";
import { LocationTile } from "./LocationTile";

type LocationDetailProps = {
    location: RuntimeLocation;
};

export const LocationDetail: React.FC<LocationDetailProps> = ({ location }) => {
    const viewsById = useSelector(selectViewsWithStateById);

    const resourceById = useSelector(selectResourceById);
    const stateById = useSelector(selectRuntimeStateByResourceId);
    const scenesById = useSelector(selectScenesById);

    return (
        <>
            <Typography variant="h2" sx={{ mb: 2 }}>{location.name ?? location.id}</Typography>
            {location.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {location.description}
                </Typography>
            )}
            <Grid2 container spacing={2} sx={{ width: "100%", margin: 0 }}>
                {location.items.map((item, idx) => (
                    <Grid2 key={`${item.kind}-${item.refId}-${idx}`} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                        <LocationItemTile item={item} viewsById={viewsById} resourceById={resourceById} stateById={stateById} scenesById={scenesById} />
                    </Grid2>
                ))}
            </Grid2>
        </>
    );
};

type LocationItemTileProps = {
    item: RuntimeLocationItem;
    viewsById: Record<string, ViewWithState>;
    resourceById: Record<string, RuntimeResource>;
    stateById: Record<string, TileRuntimeResourceState>;
    scenesById: Record<string, RuntimeScene>;
};

const LocationItemTile: React.FC<LocationItemTileProps> = ({ item, viewsById, resourceById, stateById, scenesById }) => {
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
