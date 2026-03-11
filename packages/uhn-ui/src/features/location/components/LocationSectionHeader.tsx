import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, IconButton, Typography } from "@mui/material";
import { RuntimeLocation } from "@uhn/common";
import React from "react";
import { getBlueprintIcon } from "../../view/blueprintIconMap";

type LocationSectionHeaderProps = {
    location: RuntimeLocation;
    expanded: boolean;
    onExpandToggle: () => void;
    totalItems: number;
    visibleItems: number;
    hasOverflow: boolean;
};

export const LocationSectionHeader: React.FC<LocationSectionHeaderProps> = ({
    location, expanded, onExpandToggle, totalItems, visibleItems, hasOverflow,
}) => {
    const iconEntry = location.icon ? getBlueprintIcon(location.icon) : undefined;
    const IconComponent = iconEntry?.active;
    const hiddenCount = totalItems - visibleItems;

    return (
        <Box
            onClick={hasOverflow ? onExpandToggle : undefined}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 2,
                cursor: hasOverflow ? "pointer" : "default",
                userSelect: "none",
            }}
        >
            {IconComponent && (
                <IconComponent sx={{ fontSize: 28, color: "primary.main" }} />
            )}
            <Typography variant="h2">
                {location.name ?? location.id}
            </Typography>
            {hasOverflow && (
                <Typography variant="body2" color="text.secondary"
                    sx={{ visibility: expanded ? "hidden" : "visible" }}>
                    +{hiddenCount}
                </Typography>
            )}
            {hasOverflow && (
                <IconButton size="small" sx={{ color: "text.secondary" }} onClick={(e) => { e.stopPropagation(); onExpandToggle(); }}>
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            )}
        </Box>
    );
};
