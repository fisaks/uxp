import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React from "react";
import { formatCountdown, useCountdown } from "../resource/hooks/useCountdown";
import { getBlueprintIcon } from "../view/blueprintIconMap";
import { TileStateItem } from "./tile.types";
import { formatAnalogValue } from "./formatAnalogValue";

/** Compact value item for flanking layout — label on top, value below */
export const ValueItemCompact: React.FC<{ item: TileStateItem; align: "left" | "right" }> = ({ item, align }) => {
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
    items: TileStateItem[];
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

/** Splits value items into left/right arrays for flanking layout */
export function splitFlankingValues(items: TileStateItem[]): { left: TileStateItem[]; right: TileStateItem[] } {
    const valueItems = items.filter(i => i.style === "value");
    const left: TileStateItem[] = [];
    const right: TileStateItem[] = [];
    for (let i = 0; i < valueItems.length; i++) {
        if (i === 0) left.push(valueItems[i]);
        else if (i === 1) right.push(valueItems[i]);
        else if (left.length <= right.length) left.push(valueItems[i]);
        else right.push(valueItems[i]);
    }
    return { left, right };
}

export const IndicatorItem: React.FC<{ item: TileStateItem }> = ({ item }) => {
    const theme = useTheme();
    const entry = getBlueprintIcon(item.icon as any);
    if (!entry) return null;
    const IconComponent = item.active ? entry.active : (entry.inactive ?? entry.active);
    return (
        <IconComponent
            sx={{
                fontSize: 16,
                color: item.active
                    ? (entry.colors?.active[theme.palette.mode] ?? theme.palette.info.main)
                    : theme.palette.action.disabled,
                transition: "color 0.3s",
            }}
        />
    );
};

export const FlashItem: React.FC<{ item: TileStateItem }> = ({ item }) => {
    const theme = useTheme();
    const entry = getBlueprintIcon(item.icon as any);
    if (!entry) return null;
    const IconComponent = item.active ? entry.active : (entry.inactive ?? entry.active);
    return (
        <IconComponent
            sx={{
                fontSize: 16,
                color: item.active
                    ? (entry.colors?.active[theme.palette.mode] ?? theme.palette.info.main)
                    : "transparent",
                transition: "color 0.3s",
            }}
        />
    );
};

