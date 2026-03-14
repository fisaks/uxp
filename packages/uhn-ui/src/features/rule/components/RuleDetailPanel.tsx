import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Box, Grid2, Typography } from "@mui/material";
import { closestCenter, DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RuntimeResource } from "@uhn/common";
import React, { useCallback } from "react";
import { useSelector } from "react-redux";
import { ResourceTile } from "../../resource/components/ResourceTile";
import { TileRuntimeResource, TileRuntimeResourceState } from "../../resource/resource-ui.type";
import { selectRuntimeStateByResourceId } from "../../runtime-state/runtimeStateSelector";

type RuleDetailPanelProps = {
    resourceIds: string[];
    hasSelection: boolean;
    onRemoveResource: (id: string) => void;
    onReorder: (orderedIds: string[]) => void;
    resourceById: Record<string, RuntimeResource>;
};

type SortableResourceTileProps = {
    resourceId: string;
    resource: TileRuntimeResource | undefined;
    state: TileRuntimeResourceState | undefined;
    onRemove: (id: string) => void;
};

const SortableResourceTile: React.FC<SortableResourceTileProps> = ({ resourceId, resource, state, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: resourceId });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Grid2
            ref={setNodeRef}
            style={style}
            size={{ xs: 12 }}
            sx={{ position: "relative" }}
        >
            <Box sx={{ display: "flex", alignItems: "stretch" }}>
                {/* Left: drag handle strip */}
                <Box
                    {...attributes}
                    {...listeners}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        px: 0.5,
                        cursor: "grab",
                        "&:active": { cursor: "grabbing" },
                        borderRight: 1,
                        borderColor: "divider",
                        bgcolor: "action.hover",
                        borderTopLeftRadius: (theme) => theme.shape.borderRadius * 3,
                        borderBottomLeftRadius: (theme) => theme.shape.borderRadius * 3,
                    }}
                >
                    <DragIndicatorIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </Box>

                {/* Resource tile with inline remove + link icons */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {resource ? (
                        <ResourceTile
                            resource={resource}
                            state={state}
                            mode="removable"
                            onRemove={onRemove}
                            linkTo={`/technical/resources/${resourceId}`}
                        />
                    ) : (
                        <Box sx={{ p: 2, textAlign: "center" }}>
                            <Typography variant="body2" color="text.secondary">{resourceId} (not found)</Typography>
                        </Box>
                    )}
                </Box>
            </Box>
        </Grid2>
    );
};

export const RuleDetailPanel: React.FC<RuleDetailPanelProps> = ({ resourceIds, hasSelection, onRemoveResource, onReorder, resourceById }) => {
    const stateById = useSelector(selectRuntimeStateByResourceId);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = resourceIds.indexOf(String(active.id));
        const newIndex = resourceIds.indexOf(String(over.id));
        if (oldIndex === -1 || newIndex === -1) return;

        onReorder(arrayMove(resourceIds, oldIndex, newIndex));
    }, [resourceIds, onReorder]);

    if (!hasSelection && resourceIds.length === 0) {
        return (
            <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography color="text.secondary">Select a rule to see its trigger resources</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2">
                Resources ({resourceIds.length})
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, lineHeight: 1.3 }}>
                Interact with resources to validate rule behavior. Add additional resources as needed.
            </Typography>

            {resourceIds.length > 0 ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={resourceIds} strategy={rectSortingStrategy}>
                        <Grid2 container spacing={2} sx={{ width: "100%", margin: 0 }}>
                            {resourceIds.map(id => (
                                <SortableResourceTile
                                    key={id}
                                    resourceId={id}
                                    resource={resourceById[id] as TileRuntimeResource | undefined}
                                    state={stateById[id]}
                                    onRemove={onRemoveResource}
                                />
                            ))}
                        </Grid2>
                    </SortableContext>
                </DndContext>
            ) : (
                <Typography variant="body2" color="text.secondary">No resources</Typography>
            )}
        </Box>
    );
};
