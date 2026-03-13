import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Grid2 } from "@mui/material";
import React from "react";
import { wideGridItemSx } from "../tileGridSx";

type SortableTileProps = {
    id: string;
    children: React.ReactNode;
};

export const SortableTile: React.FC<SortableTileProps> = ({ id, children }) => {
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
            {children}
        </Grid2>
    );
};
