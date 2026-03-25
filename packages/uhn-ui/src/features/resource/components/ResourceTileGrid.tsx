import { Box } from "@mui/material";
import { VirtuosoGrid } from "react-virtuoso";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";
import { ResourceTile } from "./ResourceTile";
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

type ResourceTileGridItem = { resource: TileRuntimeResource; state: TileRuntimeResourceState | undefined };

type ResourceTileGridProps = {
    items: ResourceTileGridItem[];
    highlightedTileId: string | undefined;
};

export type ResourceTileGridHandle = {
    scrollToId: (id: string) => void;
};

// Grid list container — responsive CSS grid matching the MUI Grid2 layout
const ListContainer = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    (props, ref) => (
        <Box
            ref={ref}
            {...props}
            sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                    md: "1fr 1fr 1fr",
                    lg: "1fr 1fr 1fr 1fr",
                },
                "@media (min-width: 2200px)": {
                    gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr",
                },
                width: "100%",
            }}
        />
    )
);

export const ResourceTileGrid = forwardRef<ResourceTileGridHandle, ResourceTileGridProps>(
    ({ items, highlightedTileId }, ref) => {
        const virtuosoRef = useRef<any>(null);

        useImperativeHandle(ref, () => ({
            scrollToId: (id: string) => {
                const index = items.findIndex(i => i.resource.id === id);
                if (index >= 0 && virtuosoRef.current) {
                    virtuosoRef.current.scrollToIndex({
                        index,
                        align: "center",
                        behavior: "smooth",
                    });
                }
            },
        }));

        // Auto-scroll to highlighted tile on mount
        useEffect(() => {
            if (highlightedTileId && virtuosoRef.current) {
                const index = items.findIndex(i => i.resource.id === highlightedTileId);
                if (index >= 0) {
                    // Small delay to let Virtuoso measure
                    setTimeout(() => {
                        virtuosoRef.current?.scrollToIndex({
                            index,
                            align: "center",
                            behavior: "smooth",
                        });
                    }, 100);
                }
            }
        }, [highlightedTileId]); // intentionally omit items — only scroll on first mount

        return (
            <VirtuosoGrid
                ref={virtuosoRef}
                data={items}
                useWindowScroll
                overscan={400}
                components={{
                    List: ListContainer as any,
                }}
                itemContent={(index, { resource, state }) => {
                    const isHighlighted = highlightedTileId === resource.id;
                    return isHighlighted ? (
                        <Box sx={{
                            "& > .MuiCard-root": {
                                boxShadow: (theme: any) => `0 0 0 3px ${theme.palette.primary.main}`,
                                transition: "box-shadow 0.3s ease",
                            },
                        }}>
                            <ResourceTile resource={resource} state={state} />
                        </Box>
                    ) : (
                        <ResourceTile resource={resource} state={state} />
                    );
                }}
            />
        );
    }
);
