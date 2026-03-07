import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React from "react";
import { formatCountdown, useCountdown } from "../../resource/hooks/useCountdown";
import { getBlueprintIcon } from "../blueprintIconMap";
import { StateDisplayValue } from "../viewSelectors";

export const ValueItem: React.FC<{ item: StateDisplayValue }> = ({ item }) => {
    const isTimer = item.resourceType === "timer";
    const remaining = useCountdown(item.details, item.active);

    let formatted: string;
    if (isTimer) {
        formatted = item.active && remaining > 0 ? formatCountdown(remaining) : "—";
    } else if (item.value == null) {
        formatted = "—";
    } else if (typeof item.value === "boolean") {
        formatted = item.value ? "On" : "Off";
    } else {
        formatted = `${item.value}${item.unit ? ` ${item.unit}` : ""}`;
    }

    return (
        <Typography variant="caption" color="text.secondary" noWrap>
            {item.label ? `${item.label}: ` : ""}{formatted}
        </Typography>
    );
};

export const IndicatorItem: React.FC<{ item: StateDisplayValue }> = ({ item }) => {
    const theme = useTheme();
    const IconComponent = getBlueprintIcon(item.icon as any);
    if (!IconComponent) return null;
    return (
        <IconComponent
            sx={{
                fontSize: 16,
                color: item.active
                    ? theme.palette.info.main
                    : theme.palette.action.disabled,
                transition: "color 0.3s",
            }}
        />
    );
};

export const FlashItem: React.FC<{ item: StateDisplayValue }> = ({ item }) => {
    const theme = useTheme();
    const IconComponent = getBlueprintIcon(item.icon as any);
    if (!IconComponent) return null;
    return (
        <IconComponent
            sx={{
                fontSize: 16,
                color: item.active
                    ? theme.palette.info.main
                    : "transparent",
                transition: "color 0.3s",
            }}
        />
    );
};

type ViewValueDisplayProps = {
    items: StateDisplayValue[];
};

/** Renders only value-style stateDisplay items (text values, timers). */
export const ViewValueDisplay: React.FC<ViewValueDisplayProps> = ({ items }) => {
    const valueItems = items.filter(i => i.style === "value");
    if (valueItems.length === 0) return null;

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minHeight: 20, flexWrap: "wrap" }}>
            {valueItems.map((item) => (
                <ValueItem key={item.resourceId} item={item} />
            ))}
        </Box>
    );
};
