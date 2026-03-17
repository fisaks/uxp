import { closestCenter, DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { Box, Collapse, Grid2 } from "@mui/material";
import { RuntimeLocationItem, UserFavorite } from "@uhn/common";
import React, { useCallback, useMemo } from "react";
import { exactTokenMatch, fuzzyTokenMatch, searchTokens } from "../../shared/fuzzyMatch";
import { useSelector } from "react-redux";
import { selectResourceById } from "../../resource/resourceSelector";
import { selectRuntimeStateByResourceId } from "../../runtime-state/runtimeStateSelector";
import { selectScenesById } from "../../scene/sceneSelectors";
import { selectViewsWithStateById } from "../../view/viewSelectors";
import { LocationItemTile } from "../../location/components/LocationItemTile";
import { STICKY_OFFSET } from "../../location/locationConstants";
import { selectItemSearchTextMap } from "../../location/locationSelectors";
import { useVisibleTileCount } from "../../location/hooks/useVisibleTileCount";
import { SortableTile } from "../../shared/components/SortableTile";
import { useReorderFavoritesMutation } from "../favorite.api";
import { useToggleFavorite } from "../favoriteHooks";
import { FavoritesSectionHeader } from "./FavoritesSectionHeader";

export const LOCATION_FAVORITES = "__favorites__";

type FavoritesSectionProps = {
    favorites: UserFavorite[];
    sectionRef: React.Ref<HTMLDivElement>;
    expanded: boolean;
    onExpandToggle: () => void;
    /** When set, filters visible favorites to those matching (multi-word AND on name/id). */
    filterTerm?: string;
    /** When true, use exact matching instead of fuzzy (used for voice-originated filters). */
    filterExact?: boolean;
};

export const FavoritesSection: React.FC<FavoritesSectionProps> = ({
    favorites, sectionRef, expanded, onExpandToggle, filterTerm, filterExact,
}) => {
    const tilesPerRow = useVisibleTileCount();
    const toggleFavorite = useToggleFavorite();
    const [reorderFavorites] = useReorderFavoritesMutation();

    const viewsById = useSelector(selectViewsWithStateById);
    const resourceById = useSelector(selectResourceById);
    const stateById = useSelector(selectRuntimeStateByResourceId);
    const scenesById = useSelector(selectScenesById);
    const searchTextMap = useSelector(selectItemSearchTextMap);

    // Filter favorites when search term is active (search text is precomputed in the selector)
    const filteredFavorites = useMemo(() => {
        if (!filterTerm?.trim()) return favorites;
        const tokens = searchTokens(filterTerm);
        if (tokens.length === 0) return favorites;
        const matchFn = filterExact ? exactTokenMatch : fuzzyTokenMatch;
        return favorites.filter(fav => {
            const text = searchTextMap[`${fav.itemKind}:${fav.itemRefId}`] ?? "";
            return tokens.every(token => matchFn(token, text));
        });
    }, [favorites, filterTerm, searchTextMap, filterExact]);

    const firstRowFavs = filteredFavorites.slice(0, tilesPerRow);
    const overflowFavs = filteredFavorites.slice(tilesPerRow);
    const hasOverflow = filteredFavorites.length > tilesPerRow;

    const sortableIds = useMemo(
        () => favorites.map(f => String(f.id)),
        [favorites],
    );

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = sortableIds.indexOf(String(active.id));
        const newIndex = sortableIds.indexOf(String(over.id));
        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = arrayMove(sortableIds, oldIndex, newIndex);
        reorderFavorites(newOrder.map(Number));
    }, [sortableIds, reorderFavorites]);

    const toItem = (fav: UserFavorite): RuntimeLocationItem => ({
        kind: fav.itemKind,
        refId: fav.itemRefId,
    });

    const renderTile = (fav: UserFavorite) => {
        return (
        <SortableTile key={fav.id} id={String(fav.id)}>
            <LocationItemTile
                item={toItem(fav)}
                viewsById={viewsById}
                resourceById={resourceById}
                stateById={stateById}
                scenesById={scenesById}
                isFavorite
                onToggleFavorite={() => toggleFavorite(fav.itemKind, fav.itemRefId)}
            />
        </SortableTile>
        );
    };

    if (favorites.length === 0) return null;
    if (filterTerm?.trim() && filteredFavorites.length === 0) {
        return <Box ref={sectionRef} data-location-id={LOCATION_FAVORITES} sx={{ display: "none" }} />;
    }

    return (
        <Box ref={sectionRef} data-location-id={LOCATION_FAVORITES} sx={{ mb: 4, scrollMarginTop: `${STICKY_OFFSET}px` }}>
            <FavoritesSectionHeader
                expanded={expanded}
                onExpandToggle={onExpandToggle}
                totalItems={favorites.length}
                visibleItems={Math.min(favorites.length, tilesPerRow)}
                hasOverflow={hasOverflow}
            />
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                    <Grid2 container spacing={2} sx={{ width: "100%", margin: 0 }}>
                        {firstRowFavs.map(renderTile)}
                    </Grid2>
                    {hasOverflow && (
                        <Collapse in={expanded} timeout="auto" unmountOnExit>
                            <Grid2 container spacing={2} sx={{ width: "100%", margin: 0, mt: 2 }}>
                                {overflowFavs.map(renderTile)}
                            </Grid2>
                        </Collapse>
                    )}
                </SortableContext>
            </DndContext>
        </Box>
    );
};
