import { Box, Typography } from "@mui/material";
import React, { useMemo } from "react";
import { FlashItem, FlankingColumn, IndicatorItem, splitFlankingValues } from "../view/components/ViewStateDisplay";
import { TileStateItem } from "./tile.types";

type TileContentProps = {
    icon: React.ReactNode;
    iconClickable?: boolean;
    onIconClick?: (e: React.MouseEvent) => void;
    stateValues?: TileStateItem[];
    displayName: string;
    hasAnalog?: boolean;
    pt?: number | string;
};

export const TileContent: React.FC<TileContentProps> = ({ icon, iconClickable, onIconClick, stateValues, displayName, hasAnalog, pt = 2.5 }) => {
    const { left, right } = stateValues ? splitFlankingValues(stateValues) : { left: [], right: [] };
    const indicators = useMemo(() => stateValues?.filter(i => i.style === "indicator") ?? [], [stateValues]);
    const flashItems = useMemo(() => stateValues?.filter(i => i.style === "flash") ?? [], [stateValues]);

    return (
        <Box sx={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pt,
            pb: hasAnalog ? 1 : { xs: 3, sm: 1 },
            px: 1,
            width: "100%",
        }}>
            {/* Indicators — centered above main icon */}
            {indicators.length > 0 && (
                <Box sx={{
                    position: "absolute",
                    top: 8,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: 0.5,
                    zIndex: 1,
                }}>
                    {indicators.map(item => <IndicatorItem key={item.resourceId} item={item} />)}
                </Box>
            )}

            {/* Icon row: [left values] [icon] [right values] */}
            <Box sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                mb: 0.5,
            }}>
                <FlankingColumn items={left} align="right" />
                <Box
                    sx={{
                        position: "relative",
                        flexShrink: 0,
                        ...(iconClickable && {
                            cursor: "pointer",
                            borderRadius: "50%",
                            "&:hover": { backgroundColor: "action.hover" },
                        }),
                    }}
                    onPointerDown={iconClickable ? (e: React.PointerEvent) => {
                        e.stopPropagation();
                    } : undefined}
                    onClick={onIconClick}
                >
                    {icon}
                    {flashItems.length > 0 && (
                        <Box sx={{
                            position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
                            display: "flex", gap: 0.25,
                        }}>
                            {flashItems.map(item => <FlashItem key={item.resourceId} item={item} />)}
                        </Box>
                    )}
                </Box>
                <FlankingColumn items={right} align="left" />
            </Box>

            {/* Display name */}
            <Typography
                variant="body2"
                align="center"
                sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: "1.2em",
                }}
            >
                {displayName}
            </Typography>

        </Box>
    );
};
