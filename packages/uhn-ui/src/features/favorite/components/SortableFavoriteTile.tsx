import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Grid2 } from "@mui/material";
import { RuntimeLocationItem, RuntimeResource, RuntimeScene } from "@uhn/common";
import React from "react";
import { LocationItemTile } from "../../location/components/LocationItemTile";
import { TileRuntimeResourceState } from "../../resource/resource-ui.type";
import { wideGridItemSx } from "../../shared/tileGridSx";
import { ViewWithState } from "../../view/viewSelectors";

type SortableFavoriteTileProps = {
    id: string;
    item: RuntimeLocationItem;
    viewsById: Record<string, ViewWithState>;
    resourceById: Record<string, RuntimeResource>;
    stateById: Record<string, TileRuntimeResourceState>;
    scenesById: Record<string, RuntimeScene>;
    onToggleFavorite: () => void;
};

export const SortableFavoriteTile: React.FC<SortableFavoriteTileProps> = ({
    id, item, viewsById, resourceById, stateById, scenesById, onToggleFavorite,
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Grid2
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
            sx={{ ...wideGridItemSx, cursor: "grab", "&:active": { cursor: "grabbing" } }}
        >
            <LocationItemTile
                item={item}
                viewsById={viewsById}
                resourceById={resourceById}
                stateById={stateById}
                scenesById={scenesById}
                isFavorite
                onToggleFavorite={onToggleFavorite}
            />
        </Grid2>
    );
};
