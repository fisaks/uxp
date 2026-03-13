import { Box, Collapse, Grid2 } from "@mui/material";
import { RuntimeLocation, RuntimeLocationItem } from "@uhn/common";
import React from "react";
import { useSelector } from "react-redux";
import { useFavoriteSet, useToggleFavorite } from "../../favorite/favoriteHooks";
import { wideGridItemSx } from "../../shared/tileGridSx";
import { selectResourceById } from "../../resource/resourceSelector";
import { selectRuntimeStateByResourceId } from "../../runtime-state/runtimeStateSelector";
import { selectScenesById } from "../../scene/sceneSelectors";
import { selectViewsWithStateById } from "../../view/viewSelectors";
import { STICKY_OFFSET } from "../locationConstants";
import { useVisibleTileCount } from "../hooks/useVisibleTileCount";
import { LocationItemTile } from "./LocationItemTile";
import { LocationSectionHeader } from "./LocationSectionHeader";

type LocationSectionProps = {
    location: RuntimeLocation;
    sectionRef: React.Ref<HTMLDivElement>;
    expanded: boolean;
    onExpandToggle: () => void;
};

export const LocationSection: React.FC<LocationSectionProps> = ({ location, sectionRef, expanded, onExpandToggle }) => {
    const tilesPerRow = useVisibleTileCount();
    const hasOverflow = location.items.length > tilesPerRow;

    const viewsById = useSelector(selectViewsWithStateById);
    const resourceById = useSelector(selectResourceById);
    const stateById = useSelector(selectRuntimeStateByResourceId);
    const scenesById = useSelector(selectScenesById);
    const favoriteSet = useFavoriteSet();
    const toggleFavorite = useToggleFavorite();

    const firstRowItems = location.items.slice(0, tilesPerRow);
    const overflowItems = location.items.slice(tilesPerRow);

    const renderItem = (item: RuntimeLocationItem, idx: number) => (
        <Grid2 key={`${item.kind}-${item.refId}-${idx}`}
            size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
            sx={wideGridItemSx}>
            <LocationItemTile
                item={item}
                viewsById={viewsById}
                resourceById={resourceById}
                stateById={stateById}
                scenesById={scenesById}
                isFavorite={favoriteSet.has(`${item.kind}:${item.refId}`)}
                onToggleFavorite={() => toggleFavorite(item.kind, item.refId)}
            />
        </Grid2>
    );

    return (
        <Box ref={sectionRef} data-location-id={location.id} sx={{ mb: 4, scrollMarginTop: `${STICKY_OFFSET}px` }}>
            <LocationSectionHeader
                location={location}
                expanded={expanded}
                onExpandToggle={onExpandToggle}
                totalItems={location.items.length}
                visibleItems={Math.min(location.items.length, tilesPerRow)}
                hasOverflow={hasOverflow}
            />
            {location.items.length > 0 && (
                <Grid2 container spacing={2} sx={{ width: "100%", margin: 0 }}>
                    {firstRowItems.map(renderItem)}
                </Grid2>
            )}
            {hasOverflow && (
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Grid2 container spacing={2} sx={{ width: "100%", margin: 0, mt: 2 }}>
                        {overflowItems.map((item, idx) => renderItem(item, idx + tilesPerRow))}
                    </Grid2>
                </Collapse>
            )}
        </Box>
    );
};
