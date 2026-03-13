import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import StarIcon from "@mui/icons-material/Star";
import { Box, IconButton, Typography } from "@mui/material";
import React from "react";

type FavoritesSectionHeaderProps = {
    expanded: boolean;
    onExpandToggle: () => void;
    totalItems: number;
    visibleItems: number;
    hasOverflow: boolean;
};

export const FavoritesSectionHeader: React.FC<FavoritesSectionHeaderProps> = ({
    expanded, onExpandToggle, totalItems, visibleItems, hasOverflow,
}) => {
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
            <StarIcon sx={{ fontSize: 28, color: "warning.main" }} />
            <Typography variant="h2">Favorites</Typography>
            {hasOverflow && (
                <Typography variant="body2" color="text.secondary"
                    sx={{ visibility: expanded ? "hidden" : "visible" }}>
                    +{hiddenCount}
                </Typography>
            )}
            {hasOverflow && (
                <IconButton size="small" sx={{ color: "text.secondary" }}
                    onClick={(e) => { e.stopPropagation(); onExpandToggle(); }}>
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            )}
        </Box>
    );
};
