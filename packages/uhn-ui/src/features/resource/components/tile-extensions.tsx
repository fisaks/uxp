import { Theme } from "@mui/material";
import { Box, Typography } from "@mui/material";
import { ResourceType } from "@uhn/blueprint";
import React, { ReactNode } from "react";
import { formatCountdown, useCountdown } from "../hooks/useCountdown";
import { isResourceActive } from "../isResourceActive";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";
import { AnalogOutputPanel } from "./AnalogOutputPanel";
import { ComplexTileValue } from "./ComplexTileValue";
import { SubResourcePopover } from "../../shared/SubResourcePopover";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Context available to tile renderer functions */
export type TileRenderContext = {
    resource: TileRuntimeResource;
    state: TileRuntimeResourceState | undefined;
    theme: Theme;
    iconColor: string;
    /** Opens the interaction panel (if the renderer has one) */
    onOpenInteractionPanel?: () => void;
};

/** Extended context for interaction panel renderers */
export type TilePopoverContext = TileRenderContext & {
    anchorEl: HTMLElement | null;
    onClose: () => void;
};

/** Type-specific rendering extensions for resource tiles.
 *  Not all resource types need these — digital resources use icon color as value
 *  and tile click as interaction. These extend tiles that need more. */
export type TileRendererExtensions = {
    /** Additional value display on the tile face (analog value, countdown, summary) */
    renderValue?: (ctx: TileRenderContext) => ReactNode;
    /** Additional interaction panel opened from the tile (slider, sub-resource controls) */
    renderInteractionPanel?: (ctx: TilePopoverContext) => ReactNode;
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
};

const tileValueTypographySx = {
    fontFamily: "monospace",
    fontSize: "0.7rem",
    fontWeight: 600,
};

/* ------------------------------------------------------------------ */
/* Analog tile value                                                    */
/* ------------------------------------------------------------------ */

function AnalogTileValue({ ctx, interactive, onInteract }: {
    ctx: TileRenderContext;
    interactive?: boolean;
    onInteract?: () => void;
}) {
    const { resource, state, iconColor } = ctx;
    if (state?.value === undefined) return null;

    return (
        <Box
            sx={{
                ...tileValueBoxSx,
                pointerEvents: interactive ? "auto" : "none",
            }}
            {...(interactive ? {
                onClick: (e: React.MouseEvent) => {
                    e.stopPropagation();
                    onInteract?.();
                },
            } : {})}
        >
            <Typography
                variant="caption"
                sx={{
                    ...tileValueTypographySx,
                    color: iconColor,
                    ...(interactive && {
                        cursor: "pointer",
                        borderRadius: 1,
                        px: 0.5,
                        "&:hover": {
                            backgroundColor: "action.hover",
                        },
                    }),
                }}
            >
                {state.value}{resource.unit ? ` ${resource.unit}` : ""}
            </Typography>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/* Timer tile value                                                     */
/* ------------------------------------------------------------------ */

function TimerTileValue({ ctx }: { ctx: TileRenderContext }) {
    const { state, iconColor } = ctx;
    const timerActive = ctx.resource.type === "timer" && isResourceActive(ctx.resource, state);
    const remainingSeconds = useCountdown(state?.details, timerActive);

    if (!timerActive || remainingSeconds <= 0) return null;

    return (
        <Box sx={{ ...tileValueBoxSx, pointerEvents: "none" }}>
            <Typography
                variant="caption"
                sx={{
                    ...tileValueTypographySx,
                    color: iconColor,
                }}
            >
                {formatCountdown(remainingSeconds)}
            </Typography>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/* Renderer configs                                                    */
/* ------------------------------------------------------------------ */

const analogInputRenderer: TileRendererExtensions = {
    renderValue: (ctx) => <AnalogTileValue ctx={ctx} />,
};

const analogOutputRenderer: TileRendererExtensions = {
    renderValue: (ctx) => (
        <AnalogTileValue ctx={ctx} interactive onInteract={ctx.onOpenInteractionPanel} />
    ),
    renderInteractionPanel: (ctx) => (
        <AnalogOutputPanel
            resource={ctx.resource}
            state={ctx.state}
            anchorEl={ctx.anchorEl}
            onClose={ctx.onClose}
        />
    ),
};

const timerRenderer: TileRendererExtensions = {
    renderValue: (ctx) => <TimerTileValue ctx={ctx} />,
};

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

const complexRenderer: TileRendererExtensions = {
    renderValue: (ctx) => <ComplexTileValue ctx={ctx} />,
    renderInteractionPanel: (ctx) => (
        <SubResourcePopover
            items={ctx.resource.subResources ?? []}
            title={ctx.resource.name}
            anchorEl={ctx.anchorEl}
            onClose={ctx.onClose}
        />
    ),
};

const renderers: Partial<Record<ResourceType, TileRendererExtensions>> = {
    analogInput: analogInputRenderer,
    analogOutput: analogOutputRenderer,
    virtualAnalogOutput: analogOutputRenderer,
    timer: timerRenderer,
    complex: complexRenderer,
};

export function getTileExtensions(type: ResourceType): TileRendererExtensions | undefined {
    return renderers[type];
}
