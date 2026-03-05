import { Box, Typography } from "@mui/material";
import React from "react";
import { TileRenderContext } from "./tile-extensions";

/**
 * Tile value display for complex resources.
 * Boolean compute: no text (icon color conveys active/inactive).
 * Numeric compute: shows value + unit — clickable to open interaction panel.
 */
export const ComplexTileValue: React.FC<{ ctx: TileRenderContext }> = ({ ctx }) => {
    const { state, iconColor, resource, onOpenInteractionPanel } = ctx;

    if (state?.value === undefined || typeof state.value === "boolean") return null;

    const unit = resource.unit;
    const display = typeof state.value === "number" && !Number.isInteger(state.value)
        ? state.value.toFixed(1)
        : state.value;

    return (
        <Box
            sx={{
                ...tileValueBoxSx,
                pointerEvents: onOpenInteractionPanel ? "auto" : "none",
            }}
            {...(onOpenInteractionPanel ? {
                onClick: (e: React.MouseEvent) => {
                    e.stopPropagation();
                    onOpenInteractionPanel();
                },
            } : {})}
        >
            <Typography
                variant="caption"
                sx={{
                    ...tileValueTypographySx,
                    color: iconColor,
                    ...(onOpenInteractionPanel && {
                        cursor: "pointer",
                        borderRadius: 1,
                        px: 0.5,
                        "&:hover": {
                            backgroundColor: "action.hover",
                        },
                    }),
                }}
            >
                {display}{unit ? ` ${unit}` : ""}
            </Typography>
        </Box>
    );
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
