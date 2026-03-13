import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import StarIcon from "@mui/icons-material/Star";
import { Box, IconButton, Typography } from "@mui/material";
import { MenuItemType, MultiLevelMenu, usePortalContainerRef } from "@uxp/ui-lib";
import React, { useCallback, useMemo, useState } from "react";
import { useRemoveAllFavoritesMutation } from "../favorite.api";
import { RemoveAllFavoritesDialog } from "./RemoveAllFavoritesDialog";

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
    const portalContainer = usePortalContainerRef();
    const hiddenCount = totalItems - visibleItems;
    const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
    const [removeAllFavorites] = useRemoveAllFavoritesMutation();

    const handleRemoveAll = useCallback(() => {
        removeAllFavorites();
        setRemoveConfirmOpen(false);
    }, [removeAllFavorites]);

    const menuItems: MenuItemType[] = useMemo(() => [
        {
            icon: <DeleteSweepIcon sx={{ color: "text.secondary" }} />,
            label: "Remove all favorites",
            onClick: () => setRemoveConfirmOpen(true),
        },
    ], []);

    return (
        <>
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
                <div onClick={(e) => e.stopPropagation()} style={{ marginLeft: "auto" }}>
                    <MultiLevelMenu
                        triggerIcon={<MoreVertIcon />}
                        tooltipText="Actions"
                        container={portalContainer.current}
                        menuItems={menuItems}
                    />
                </div>
            </Box>
            <RemoveAllFavoritesDialog
                open={removeConfirmOpen}
                onClose={() => setRemoveConfirmOpen(false)}
                onConfirm={handleRemoveAll}
                container={portalContainer.current}
            />
        </>
    );
};
