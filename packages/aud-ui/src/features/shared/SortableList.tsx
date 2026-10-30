import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, Modifier, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Box, IconButton } from "@mui/material";
import React, { useEffect, useState } from "react";

// The list only moves up and down.
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });
// Only the handle starts a drag, so the rest of a row scrolls on a phone, and it starts after a short move so a tap on it does not.
const DRAG_STARTS_AFTER_PX = 4;

type SortableRowProps = {
    id: string;
    children: (handle: React.ReactNode) => React.ReactNode;
};

const SortableRow: React.FC<SortableRowProps> = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
    const handle = (
        <IconButton
            ref={setActivatorNodeRef}
            size="small"
            aria-label="Drag to move"
            {...attributes}
            {...listeners}
            sx={{ touchAction: "none", cursor: "grab", "&:active": { cursor: "grabbing" } }}
        >
            <DragIndicatorIcon fontSize="small" />
        </IconButton>
    );
    return (
        <Box
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, position: "relative", zIndex: isDragging ? 1 : "auto" }}
            sx={{ opacity: isDragging ? 0.6 : 1, bgcolor: isDragging ? "background.paper" : undefined }}
        >
            {children(handle)}
        </Box>
    );
};

type SortableListProps<T> = {
    items: T[];
    /** A key that is different for every item of the list, also when the same thing is in it twice. */
    getKey: (item: T, index: number) => string;
    /** Asked to move the item at `from` to `to`. Answering false puts the list back as it was. */
    onMove: (from: number, to: number) => Promise<boolean | void> | void;
    /** Draws a row. `handle` is the grip to drag it by, to be placed in the row. */
    renderItem: (item: T, index: number, handle: React.ReactNode) => React.ReactNode;
};

/**
 * A list whose rows are moved by dragging them by their handle, with the mouse, a finger or the keyboard (@dnd-kit, as in
 * the UHN app). The list is moved at once and the move is then sent on, so it does not jump back while the answer is on its way.
 */
export const SortableList = <T,>({ items, getKey, onMove, renderItem }: SortableListProps<T>) => {
    const [shown, setShown] = useState(items);
    useEffect(() => setShown(items), [items]);
    const keys = shown.map(getKey);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: DRAG_STARTS_AFTER_PX } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async ({ active, over }: DragEndEvent) => {
        const from = keys.indexOf(String(active.id));
        const to = over ? keys.indexOf(String(over.id)) : -1;
        if (from === -1 || to === -1 || from === to) {
            return;
        }
        setShown(arrayMove(shown, from, to));
        if ((await onMove(from, to)) === false) {
            setShown(items);
        }
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[verticalOnly]} onDragEnd={handleDragEnd}>
            <SortableContext items={keys} strategy={verticalListSortingStrategy}>
                {shown.map((item, index) => (
                    <SortableRow key={keys[index]} id={keys[index]}>
                        {(handle) => renderItem(item, index, handle)}
                    </SortableRow>
                ))}
            </SortableContext>
        </DndContext>
    );
};

/** Keys for a list of ids in which the same id may come twice: "id#0", "id#1" for the second one. */
export const uniqueKeys = (ids: string[]): string[] => {
    const seen = new Map<string, number>();
    return ids.map((id) => {
        const count = seen.get(id) ?? 0;
        seen.set(id, count + 1);
        return `${id}#${count}`;
    });
};
