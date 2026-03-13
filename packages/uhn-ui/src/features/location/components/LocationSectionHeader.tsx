import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Box, IconButton, Typography } from "@mui/material";
import { RuntimeLocation } from "@uhn/common";
import { MenuItemType, MultiLevelMenu, usePortalContainerRef } from "@uxp/ui-lib";
import React, { useMemo } from "react";
import { getBlueprintIcon } from "../../view/blueprintIconMap";

type LocationSectionHeaderProps = {
    location: RuntimeLocation;
    expanded: boolean;
    onExpandToggle: () => void;
    totalItems: number;
    visibleItems: number;
    hasOverflow: boolean;
    hasCustomOrder: boolean;
    onResetOrder: () => void;
};

export const LocationSectionHeader: React.FC<LocationSectionHeaderProps> = ({
    location, expanded, onExpandToggle, totalItems, visibleItems, hasOverflow, hasCustomOrder, onResetOrder,
}) => {
    const portalContainer = usePortalContainerRef();
    const iconEntry = location.icon ? getBlueprintIcon(location.icon) : undefined;
    const IconComponent = iconEntry?.active;
    const hiddenCount = totalItems - visibleItems;

    const menuItems: MenuItemType[] = useMemo(() => {
        const items: MenuItemType[] = [];
        if (hasCustomOrder) {
            items.push({
                icon: <RestartAltIcon sx={{ color: "text.secondary" }} />,
                label: "Reset order",
                onClick: onResetOrder,
            });
        }
        return items;
    }, [hasCustomOrder, onResetOrder]);

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
                <IconButton size="small" sx={{ color: "text.secondary", "&:hover": { bgcolor: "action.hover" } }} onClick={(e) => { e.stopPropagation(); onExpandToggle(); }}>
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            )}
            <div onClick={(e) => e.stopPropagation()} style={{ marginLeft: "auto", visibility: hasCustomOrder ? "visible" : "hidden" }}>
                <MultiLevelMenu
                    triggerIcon={<MoreVertIcon />}
                    triggerSx={{ color: "text.secondary", "&:hover": { bgcolor: "action.hover" } }}
                    tooltipText="Actions"
                    container={portalContainer.current}
                    menuItems={menuItems}
                />
            </div>
        </Box>
    );
};
