import DescriptionIcon from "@mui/icons-material/Description";
import { Box, IconButton, Popover, Tooltip, Typography } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useCallback, useState } from "react";
import { createTooltipProps } from "./tileEventHelpers";

type TileDescriptionPopoverProps = {
    description: string | undefined;
};

export const TileDescriptionPopover: React.FC<TileDescriptionPopoverProps> = ({ description }) => {
    const portalContainer = usePortalContainerRef();
    const [anchor, setAnchor] = useState<null | HTMLElement>(null);
    const tooltipProps = createTooltipProps(portalContainer.current);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setAnchor(e.currentTarget);
    }, []);

    if (!description) return null;

    return (
        <Box sx={{ position: "absolute", top: 6, right: 6, zIndex: 2, pointerEvents: "auto" }}>
            <Tooltip title="Show description" {...tooltipProps}>
                <IconButton size="small" onClick={handleClick} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                    <DescriptionIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                </IconButton>
            </Tooltip>
            <Popover
                open={!!anchor}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                container={portalContainer.current}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Box sx={{ p: 2, minWidth: 200 }}>
                    <Typography variant="body2">{description}</Typography>
                </Box>
            </Popover>
        </Box>
    );
};
