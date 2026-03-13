import { closestCenter, DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { Box, Collapse, Grid2 } from "@mui/material";
import { LocationItemRef, RuntimeLocation, RuntimeLocationItem } from "@uhn/common";
import React, { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { useFavoriteSet, useToggleFavorite } from "../../favorite/favoriteHooks";
import { selectResourceById } from "../../resource/resourceSelector";
import { selectRuntimeStateByResourceId } from "../../runtime-state/runtimeStateSelector";
import { selectScenesById } from "../../scene/sceneSelectors";
import { SortableTile } from "../../shared/components/SortableTile";
import { selectViewsWithStateById } from "../../view/viewSelectors";
import { STICKY_OFFSET } from "../locationConstants";
import { useVisibleTileCount } from "../hooks/useVisibleTileCount";
import { useOrderedLocationItems } from "../hooks/useOrderedLocationItems";
import { LocationItemTile } from "./LocationItemTile";
import { LocationSectionHeader } from "./LocationSectionHeader";

type LocationSectionProps = {
    /** The blueprint location definition including its items. */
    location: RuntimeLocation;
    /** User-saved item order for this location. When undefined, blueprint order is used. */
    savedOrder?: LocationItemRef[];
    sectionRef: React.Ref<HTMLDivElement>;
    expanded: boolean;
    onExpandToggle: () => void;
    /** Called after a drag-and-drop reorder with the new item order. */
    onReorder: (locationItems: LocationItemRef[]) => void;
    /** Called when the user resets the custom order back to blueprint default. */
    onResetOrder: () => void;
};

export const LocationSection: React.FC<LocationSectionProps> = ({
    location, savedOrder, sectionRef, expanded, onExpandToggle, onReorder, onResetOrder,
}) => {
    const locationItems = useOrderedLocationItems(location.items, savedOrder);
    const hasCustomOrder = !!savedOrder;
    const tilesPerRow = useVisibleTileCount();
    const hasOverflow = locationItems.length > tilesPerRow;

    const viewsById = useSelector(selectViewsWithStateById);
    const resourceById = useSelector(selectResourceById);
    const stateById = useSelector(selectRuntimeStateByResourceId);
    const scenesById = useSelector(selectScenesById);
    const favoriteSet = useFavoriteSet();
    const toggleFavorite = useToggleFavorite();

    const firstRowItems = locationItems.slice(0, tilesPerRow);
    const overflowItems = locationItems.slice(tilesPerRow);

    const sortableIds = useMemo(
        () => locationItems.map(item => `${item.kind}:${item.refId}`),
        [locationItems],
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
        const reorderedItems: LocationItemRef[] = newOrder.map(id => {
            const [kind, refId] = id.split(":");
            return { kind: kind as LocationItemRef["kind"], refId };
        });
        onReorder(reorderedItems);
    }, [sortableIds, onReorder]);

    const renderTile = (item: RuntimeLocationItem) => (
        <SortableTile key={`${item.kind}:${item.refId}`} id={`${item.kind}:${item.refId}`}>
            <LocationItemTile
                item={item}
                viewsById={viewsById}
                resourceById={resourceById}
                stateById={stateById}
                scenesById={scenesById}
                isFavorite={favoriteSet.has(`${item.kind}:${item.refId}`)}
                onToggleFavorite={() => toggleFavorite(item.kind, item.refId)}
            />
        </SortableTile>
    );

    return (
        <Box ref={sectionRef} data-location-id={location.id} sx={{ mb: 4, scrollMarginTop: `${STICKY_OFFSET}px` }}>
            <LocationSectionHeader
                location={location}
                expanded={expanded}
                onExpandToggle={onExpandToggle}
                totalItems={locationItems.length}
                visibleItems={Math.min(locationItems.length, tilesPerRow)}
                hasOverflow={hasOverflow}
                hasCustomOrder={hasCustomOrder}
                onResetOrder={onResetOrder}
            />
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                    {locationItems.length > 0 && (
                        <Grid2 container spacing={2} sx={{ width: "100%", margin: 0 }}>
                            {firstRowItems.map(renderTile)}
                        </Grid2>
                    )}
                    {hasOverflow && (
                        <Collapse in={expanded} timeout="auto" unmountOnExit>
                            <Grid2 container spacing={2} sx={{ width: "100%", margin: 0, mt: 2 }}>
                                {overflowItems.map(renderTile)}
                            </Grid2>
                        </Collapse>
                    )}
                </SortableContext>
            </DndContext>
        </Box>
    );
};
