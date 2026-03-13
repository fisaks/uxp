import { closestCenter, DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography } from "@mui/material";
import { RuntimeLocation } from "@uhn/common";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { getBlueprintIcon } from "../../view/blueprintIconMap";
import { useOrderedLocations } from "../hooks/useOrderedLocations";
import { useFetchLocationSectionOrderQuery, useSaveLocationSectionOrderMutation, useDeleteLocationSectionOrderMutation } from "../location-section-order.api";
import { selectAllLocations } from "../locationSelectors";

type ReorderLocationsDialogProps = {
    open: boolean;
    onClose: () => void;
};

export const ReorderLocationsDialog: React.FC<ReorderLocationsDialogProps> = ({ open, onClose }) => {
    const portalContainer = usePortalContainerRef();
    const blueprintLocations = useSelector(selectAllLocations);
    const { data: locationSectionOrder } = useFetchLocationSectionOrderQuery();
    const [saveLocationSectionOrder] = useSaveLocationSectionOrderMutation();
    const [deleteLocationSectionOrder] = useDeleteLocationSectionOrderMutation();

    const savedLocationIds = locationSectionOrder?.locationIds;
    const hasCustomOrder = !!savedLocationIds && savedLocationIds.length > 0;
    const mergedLocations = useOrderedLocations(blueprintLocations, hasCustomOrder ? savedLocationIds : undefined);

    const [localOrder, setLocalOrder] = useState<RuntimeLocation[]>([]);
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

    // Initialize local state when dialog opens
    useEffect(() => {
        if (open) {
            setLocalOrder(mergedLocations);
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const sortableIds = useMemo(
        () => localOrder.map(loc => loc.id),
        [localOrder],
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

        setLocalOrder(prev => arrayMove(prev, oldIndex, newIndex));
    }, [sortableIds]);

    const hasChanges = useMemo(() => {
        const currentIds = mergedLocations.map(l => l.id);
        const localIds = localOrder.map(l => l.id);
        return currentIds.length !== localIds.length || currentIds.some((id, i) => id !== localIds[i]);
    }, [mergedLocations, localOrder]);

    const handleSave = useCallback(() => {
        saveLocationSectionOrder({ locationIds: localOrder.map(l => l.id) });
        onClose();
    }, [localOrder, saveLocationSectionOrder, onClose]);

    const handleReset = useCallback(() => {
        deleteLocationSectionOrder();
        setResetConfirmOpen(false);
        onClose();
    }, [deleteLocationSectionOrder, onClose]);

    return (
        <>
        <Dialog open={open} onClose={onClose} container={portalContainer.current} maxWidth="xs" fullWidth>
            <DialogTitle>Reorder locations</DialogTitle>
            <DialogContent>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                        {localOrder.map(loc => (
                            <SortableLocationRow key={loc.id} id={loc.id} location={loc} />
                        ))}
                    </SortableContext>
                </DndContext>
            </DialogContent>
            <DialogActions>
                {hasCustomOrder && (
                    <Button onClick={() => setResetConfirmOpen(true)} color="warning" sx={{ mr: "auto" }}>
                        Reset to default
                    </Button>
                )}
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={!hasChanges}>Save</Button>
            </DialogActions>
        </Dialog>
        <Dialog open={resetConfirmOpen} onClose={() => setResetConfirmOpen(false)} container={portalContainer.current}>
            <DialogTitle>Reset to default order</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Reset location order to the default blueprint order?
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setResetConfirmOpen(false)}>Cancel</Button>
                <Button onClick={handleReset} color="warning" variant="contained">Reset</Button>
            </DialogActions>
        </Dialog>
        </>
    );
};

type SortableLocationRowProps = {
    id: string;
    location: RuntimeLocation;
};

const SortableLocationRow: React.FC<SortableLocationRowProps> = ({ id, location }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const iconEntry = location.icon ? getBlueprintIcon(location.icon) : undefined;
    const IconComponent = iconEntry?.active;

    return (
        <Box
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 1.5,
                py: 1,
                borderRadius: 1,
                cursor: "grab",
                "&:active": { cursor: "grabbing" },
                "&:hover": { bgcolor: "action.hover" },
            }}
        >
            <DragIndicatorIcon sx={{ color: "text.secondary", fontSize: 20 }} />
            {IconComponent && <IconComponent sx={{ fontSize: 22, color: "primary.main" }} />}
            <Typography variant="body1">{location.name ?? location.id}</Typography>
        </Box>
    );
};
