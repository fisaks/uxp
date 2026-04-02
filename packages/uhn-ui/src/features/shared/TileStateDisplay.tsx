import { Box, Tooltip, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React, { useCallback, useEffect, useState } from "react";
import { formatCountdown, useCountdown } from "../resource/hooks/useCountdown";
import { getBlueprintIcon } from "../view/blueprintIconMap";
import type { HeroFontSize } from "@uhn/blueprint";
import { DisplayItemIconState, DisplayItemValueState } from "./tile.types";
import { formatAnalogValue } from "./formatAnalogValue";

/* ------------------------------------------------------------------ */
/* DisplayValue rendering (left / right / hero slots)                  */
/* ------------------------------------------------------------------ */

/** Compact value item for flanking layout — label on top, value below */
export const ValueItemCompact: React.FC<{ item: DisplayItemValueState; align: "left" | "right" }> = ({ item }) => {
    const isTimer = item.resourceType === "timer";
    const remaining = useCountdown(item.details, item.active);

    let formatted: string;
    if (isTimer) {
        if (remaining > 0) {
            formatted = formatCountdown(remaining);
        } else if (item.active) {
            formatted = "Active";
        } else {
            formatted = "—";
        }
    } else if (item.value == null) {
        formatted = "—";
    } else if (typeof item.value === "boolean") {
        formatted = item.value ? "On" : "Off";
    } else {
        const display = typeof item.value === "number"
            ? formatAnalogValue(item.value, item.decimalPrecision)
            : item.value;
        formatted = `${display}${item.unit ? ` ${item.unit}` : ""}`;
    }

    const iconEntry = item.icon ? getBlueprintIcon(item.icon as any) : null;
    const IconComponent = iconEntry ? (item.active ? iconEntry.active : (iconEntry.inactive ?? iconEntry.active)) : null;

    if (IconComponent) {
        // Icon mode: icon + value on same row, label as tooltip
        return (
            <Tooltip title={item.label ?? ""} arrow>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
                    <IconComponent sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }} />
                    <Typography
                        variant="caption"
                        noWrap
                        sx={{ fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 600, color: "text.secondary", lineHeight: 1.3 }}
                    >
                        {formatted}
                    </Typography>
                </Box>
            </Tooltip>
        );
    }

    return (
        <Box sx={{ textAlign: "center", minWidth: "3.5em" }}>
            {item.label && (
                <Typography
                    variant="caption"
                    noWrap
                    sx={{ fontSize: "0.7rem", color: "text.secondary", lineHeight: 1.3, display: "block" }}
                >
                    {item.label}
                </Typography>
            )}
            <Typography
                variant="caption"
                noWrap
                sx={{ fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 600, color: "text.secondary", lineHeight: 1.3 }}
            >
                {formatted}
            </Typography>
        </Box>
    );
};

/** Renders the flanking column (left or right side of icon) */
export const FlankingColumn: React.FC<{
    items: DisplayItemValueState[];
    align: "left" | "right";
}> = ({ items, align }) => {
    if (items.length === 0) return <Box sx={{ flex: 1 }} />;
    return (
        <Box sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: align === "left" ? "flex-end" : "flex-start",
            gap: 0.5,
            minWidth: 0,
            // Pull values closer to icon instead of sitting at tile edges
            ...(align === "right" && { pl: 1, pr: 0 }),
            ...(align === "left" && { pr: 1, pl: 0 }),
        }}>
            {items.map(item => (
                <ValueItemCompact key={item.resourceId} item={item} align={align} />
            ))}
        </Box>
    );
};

/* ------------------------------------------------------------------ */
/* DisplayIcon rendering (topLeft / topCenter / topRight / badge)      */
/* ------------------------------------------------------------------ */

/** Renders a single DisplayItemIconState with visibility, color, and tooltip. */
export const DisplayIconRenderer: React.FC<{
    item: DisplayItemIconState;
    portalContainer?: HTMLElement | null;
}> = ({ item, portalContainer }) => {
    const theme = useTheme();
    if (!item.visible) return null;

    const entry = getBlueprintIcon(item.icon as any);
    if (!entry) return null;

    const IconComponent = item.active ? entry.active : (entry.inactive ?? entry.active);

    // Resolve color: item.color is a theme palette token like "success", "warning", "error"
    let resolvedColor: string;
    if (item.color) {
        const palette = (theme.palette as any)[item.color];
        resolvedColor = palette?.main ?? theme.palette.text.secondary;
    } else {
        resolvedColor = item.active
            ? (entry.colors?.active[theme.palette.mode] ?? theme.palette.info.main)
            : theme.palette.action.disabled;
    }

    // Tooltip is pre-resolved by the selector ("value" → formatted value + unit)
    const tooltipText = item.tooltip ?? "";

    const iconElement = (
        <IconComponent
            sx={{
                fontSize: 16,
                color: resolvedColor,
                transition: "color 0.3s",
            }}
        />
    );

    if (tooltipText) {
        return (
            <Tooltip
                title={tooltipText}
                arrow
                slotProps={{
                    popper: { container: portalContainer ?? undefined },
                }}
            >
                {iconElement}
            </Tooltip>
        );
    }

    return iconElement;
};

/* ------------------------------------------------------------------ */
/* Hero value rendering                                                */
/* ------------------------------------------------------------------ */

const HERO_FONT_SIZE_MAP: Record<HeroFontSize, string> = {
    "tiny": "1rem",
    "small": "1.25rem",
    "default": "1.5rem",
    "large": "1.75rem",
    "x-large": "2rem",
};

/** Single hero value — large font, value + unit only, no label. */
const HeroValue: React.FC<{ item: DisplayItemValueState; fontSize: string }> = ({ item, fontSize }) => {
    const isTimer = item.resourceType === "timer";
    const remaining = useCountdown(item.details, item.active);

    let formatted: string;
    if (isTimer) {
        if (remaining > 0) {
            formatted = formatCountdown(remaining);
        } else if (item.active) {
            formatted = "Active";
        } else {
            formatted = "—";
        }
    } else if (item.value == null) {
        formatted = "—";
    } else if (typeof item.value === "boolean") {
        formatted = item.value ? "On" : "Off";
    } else {
        const display = typeof item.value === "number"
            ? formatAnalogValue(item.value, item.decimalPrecision)
            : item.value;
        formatted = `${display}${item.unit ? ` ${item.unit}` : ""}`;
    }

    return (
        <Typography
            variant="body1"
            sx={{
                fontFamily: "monospace",
                fontSize,
                fontWeight: 700,
                color: "text.primary",
                lineHeight: 1.2,
            }}
        >
            {formatted}
        </Typography>
    );
};

/** Hook for auto-rotating carousel index with manual advance.
 *  Manual advance resets the auto-rotate timer so it doesn't jump immediately after a tap. */
function useCarousel(count: number, intervalMs = 5000): [number, () => void] {
    const [index, setIndex] = useState(0);
    const [resetKey, setResetKey] = useState(0);

    useEffect(() => {
        if (count <= 1) return;
        const timer = setInterval(() => {
            setIndex(prev => (prev + 1) % count);
        }, intervalMs);
        return () => clearInterval(timer);
    }, [count, intervalMs, resetKey]);

    // Reset index if count shrinks
    useEffect(() => {
        if (index >= count) setIndex(0);
    }, [count, index]);

    const advance = useCallback(() => {
        setIndex(prev => (prev + 1) % count);
        setResetKey(prev => prev + 1); // restart auto-rotate timer
    }, [count]);

    return [count <= 1 ? 0 : index, advance];
}

/** Hero carousel — auto-rotates through multiple hero values with dot indicators.
 *  Tapping the value area advances to the next item. */
export const HeroCarousel: React.FC<{ items: DisplayItemValueState[]; heroSize?: HeroFontSize }> = ({ items, heroSize }) => {
    const [activeIndex, advance] = useCarousel(items.length);

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        advance();
    }, [advance]);

    const resolvedFontSize = HERO_FONT_SIZE_MAP[heroSize ?? "default"] ?? HERO_FONT_SIZE_MAP.default;

    if (items.length === 0) return null;
    if (items.length === 1) return <HeroValue item={items[0]} fontSize={resolvedFontSize} />;

    return (
        <Box
            onClick={handleClick}
            sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25, cursor: "pointer" }}
        >
            <Box sx={{ position: "relative", minHeight: "1.4em" }}>
                {items.map((item, i) => (
                    <Box
                        key={item.resourceId}
                        sx={{
                            position: i === 0 ? "relative" : "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            opacity: i === activeIndex ? 1 : 0,
                            transition: "opacity 0.4s ease",
                            display: "flex",
                            justifyContent: "center",
                        }}
                    >
                        <HeroValue item={item} fontSize={resolvedFontSize} />
                    </Box>
                ))}
            </Box>
            {/* Dot indicators */}
            <Box sx={{ display: "flex", gap: 0.5 }}>
                {items.map((item, i) => (
                    <Box
                        key={item.resourceId}
                        sx={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            backgroundColor: i === activeIndex ? "text.primary" : "action.disabled",
                            transition: "background-color 0.3s",
                        }}
                    />
                ))}
            </Box>
        </Box>
    );
};
