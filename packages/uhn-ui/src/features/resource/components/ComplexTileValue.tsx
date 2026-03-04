import { Box, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectRuntimeState } from "../../runtime-state/runtimeStateSelector";
import { selectResourceById } from "../resourceSelector";
import { TileRenderContext } from "./tile-extensions";

/**
 * Tile value display for complex resources.
 * Supports three summary modes: primary, carousel, computed.
 */
export const ComplexTileValue: React.FC<{ ctx: TileRenderContext }> = ({ ctx }) => {
    const { resource, state, iconColor } = ctx;
    const tileSummary = resource.tileSummary;
    const subResources = resource.subResources;
    const resourceById = useSelector(selectResourceById);
    const runtimeState = useSelector(selectRuntimeState);

    if (!tileSummary || !subResources?.length) return null;

    if (tileSummary.mode === "primary") {
        const subState = runtimeState.byResourceId[tileSummary.resourceId];
        const subResource = resourceById[tileSummary.resourceId];
        if (subState?.value === undefined) return null;
        const unit = (subResource as { unit?: string })?.unit;
        return (
            <TileValue iconColor={iconColor}>
                {subState.value}{unit ? ` ${unit}` : ""}
            </TileValue>
        );
    }

    if (tileSummary.mode === "carousel") {
        return (
            <CarouselSummary
                resourceIds={tileSummary.resourceIds}
                intervalMs={tileSummary.intervalMs ?? 3000}
                iconColor={iconColor}
                resourceById={resourceById}
                stateByResourceId={runtimeState.byResourceId}
            />
        );
    }

    if (tileSummary.mode === "computed") {
        // Computed value comes from the complex resource's own state (set by ComplexComputeService in sandbox)
        if (state?.value === undefined) return null;
        const unit = tileSummary.unit;
        const display = typeof state.value === "number" && !Number.isInteger(state.value)
            ? state.value.toFixed(1)
            : state.value;
        return (
            <TileValue iconColor={iconColor}>
                {display}{unit ? ` ${unit}` : ""}
            </TileValue>
        );
    }

    return null;
};

/* ------------------------------------------------------------------ */
/* Shared tile value style                                              */
/* ------------------------------------------------------------------ */

const tileValueBoxSx = {
    position: "absolute" as const,
    top: 0,
    left: "50%",
    right: 0,
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none" as const,
};

const tileValueTypographySx = {
    fontFamily: "monospace",
    fontSize: "0.7rem",
    fontWeight: 600,
};

const TileValue: React.FC<{ iconColor: string; children: React.ReactNode }> = ({ iconColor, children }) => (
    <Box sx={tileValueBoxSx}>
        <Typography variant="caption" sx={{ ...tileValueTypographySx, color: iconColor }}>
            {children}
        </Typography>
    </Box>
);

/* ------------------------------------------------------------------ */
/* Carousel: cycle through sub-resource values                         */
/* ------------------------------------------------------------------ */

type StateByResourceId = Record<string, { value?: boolean | number; timestamp?: number } | undefined>;
type ResourceByIdMap = Record<string, { name?: string; unit?: string; [k: string]: unknown } | undefined>;

const CarouselSummary: React.FC<{
    resourceIds: string[];
    intervalMs: number;
    iconColor: string;
    resourceById: ResourceByIdMap;
    stateByResourceId: StateByResourceId;
}> = ({ resourceIds, intervalMs, iconColor, resourceById, stateByResourceId }) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (resourceIds.length <= 1) return;
        const id = setInterval(() => {
            setIndex(prev => (prev + 1) % resourceIds.length);
        }, intervalMs);
        return () => clearInterval(id);
    }, [resourceIds.length, intervalMs]);

    const currentRef = resourceIds[index % resourceIds.length];
    const subState = stateByResourceId[currentRef];
    const subResource = resourceById[currentRef];
    if (subState?.value === undefined) return null;

    const unit = subResource?.unit;
    const name = subResource?.name;
    return (
        <TileValue iconColor={iconColor}>
            {name ? `${name}: ` : ""}{subState.value}{unit ? ` ${unit}` : ""}
        </TileValue>
    );
};
