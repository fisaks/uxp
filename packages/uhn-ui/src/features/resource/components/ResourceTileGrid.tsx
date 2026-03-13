import Grid2 from "@mui/material/Grid2/Grid2";
import { wideGridItemSx } from "../../shared/tileGridSx";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";
import { ResourceTile } from "./ResourceTile";
import React from "react";

type ResourceTileGridProps = {
    items: { resource: TileRuntimeResource; state: TileRuntimeResourceState | undefined }[];
    highlightedTileId: string | undefined;
    highlightedTileRef: (id: string) => ((el: HTMLElement | null) => void) | undefined;
};

export const ResourceTileGrid: React.FC<ResourceTileGridProps> = ({ items, highlightedTileId, highlightedTileRef }) => {
    return (
        <Grid2 container spacing={2} sx={{ width: "100%", margin: 0 }}>
            {items.map(({ resource, state }) => (
                <Grid2 key={resource.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                    ref={highlightedTileId ? highlightedTileRef(resource.id) : undefined}
                    sx={{
                        ...wideGridItemSx,
                        ...(highlightedTileId === resource.id && {
                            "& > .MuiCard-root": {
                                boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}`,
                                transition: "box-shadow 0.3s ease",
                            },
                        }),
                    }}>
                    <ResourceTile resource={resource} state={state} />
                </Grid2>
            ))}
        </Grid2>
    );
};
