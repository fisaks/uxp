import { Box, Typography } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React from "react";
import { DisplayIconRenderer, FlankingColumn, HeroCarousel } from "./TileStateDisplay";
import { DisplayItemsState } from "./tile.types";

type TileContentProps = {
    /** Main icon element (e.g. MUI SvgIcon with color and size applied) */
    icon: React.ReactNode;
    /** When set, icon gets a pointer cursor, hover highlight, and this click handler. Used by complex resource tiles. */
    onIconClick?: (e: React.MouseEvent) => void;
    /** Slot-keyed state display with resolved runtime state */
    stateDisplay?: DisplayItemsState;
    /** Label shown below the icon */
    displayName: string;
    /** Optional secondary text shown below the name (e.g. scene description). Clamped to 2 lines. */
    subtitle?: string;
    /** Reduces bottom padding to make room for the analog slider section below */
    hasAnalog?: boolean;
    /** Whether to show the hero slot. Default: true. Set to false when inline analog control is present. */
    showHero?: boolean;
    /** Top padding — use to clear absolutely positioned elements above (e.g. info icons in ViewTile). Default: 2.5 */
    pt?: number | string;
};

export const TileContent: React.FC<TileContentProps> = ({ icon, onIconClick, stateDisplay, displayName, subtitle, hasAnalog, showHero = true, pt = 2.5 }) => {
    const portalContainer = usePortalContainerRef();

    const topLeft = stateDisplay?.topLeft ?? [];
    const topCenter = stateDisplay?.topCenter ?? [];
    const topRight = stateDisplay?.topRight ?? [];
    const left = stateDisplay?.left ?? [];
    const right = stateDisplay?.right ?? [];
    const badge = stateDisplay?.badge ?? [];
    const hero = stateDisplay?.hero ?? [];
    const hasTopRow = topLeft.length > 0 || topCenter.length > 0 || topRight.length > 0;

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
            {/* Top row: topLeft | topCenter | topRight
             * Inset left/right to avoid overlap with tile-level icons
             * (info, description, favorite star, future context menu). */}
            {hasTopRow && (
                <Box sx={{
                    position: "absolute",
                    top: 10,
                    left: 28,
                    right: 28,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    zIndex: 1,
                }}>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                        {topLeft.map(item => <DisplayIconRenderer key={item.resourceId} item={item} portalContainer={portalContainer.current} />)}
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                        {topCenter.map(item => <DisplayIconRenderer key={item.resourceId} item={item} portalContainer={portalContainer.current} />)}
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                        {topRight.map(item => <DisplayIconRenderer key={item.resourceId} item={item} portalContainer={portalContainer.current} />)}
                    </Box>
                </Box>
            )}

            {/* Icon row: [left values] [icon] [right values] */}
            <Box sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                mb: 0.5,
                ...(hasTopRow && { mt: 1.5 }),
            }}>
                <FlankingColumn items={left} align="right" />
                <Box
                    sx={{
                        position: "relative",
                        flexShrink: 0,
                        ...(onIconClick && {
                            cursor: "pointer",
                            borderRadius: "50%",
                            "&:hover": { backgroundColor: "action.hover" },
                        }),
                    }}
                    onPointerDown={onIconClick ? (e: React.PointerEvent) => {
                        e.stopPropagation();
                    } : undefined}
                    onClick={onIconClick}
                >
                    {icon}
                    {/* Badge row — below icon */}
                    {badge.length > 0 && (
                        <Box sx={{
                            position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
                            display: "flex", gap: 0.25,
                        }}>
                            {badge.map(item => <DisplayIconRenderer key={item.resourceId} item={item} portalContainer={portalContainer.current} />)}
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
                    WebkitLineClamp: subtitle ? 1 : 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: "1.2em",
                }}
            >
                {displayName}
            </Typography>

            {/* Hero — large centered value carousel, uses remaining tile space */}
            {showHero && hero.length > 0 && (
                <Box sx={{ mt: 0.75, flex: 1, display: "flex", alignItems: "flex-start" }}>
                    <HeroCarousel items={hero} heroSize={stateDisplay?.heroSize} />
                </Box>
            )}

            {/* Subtitle (e.g. scene description) */}
            {subtitle && (
                <Typography
                    variant="caption"
                    align="center"
                    color="text.secondary"
                    sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        lineHeight: "1.3em",
                    }}
                >
                    {subtitle}
                </Typography>
            )}

        </Box>
    );
};
