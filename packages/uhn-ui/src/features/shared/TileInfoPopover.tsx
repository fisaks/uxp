import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, IconButton, Popover, Tooltip } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useCallback, useState } from "react";
import { createTooltipProps } from "./tileEventHelpers";

type TileInfoPopoverProps = {
    children: React.ReactNode;
};

export const TileInfoPopover: React.FC<TileInfoPopoverProps> = ({ children }) => {
    const portalContainer = usePortalContainerRef();
    const [anchor, setAnchor] = useState<null | HTMLElement>(null);
    const tooltipProps = createTooltipProps(portalContainer.current);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setAnchor(e.currentTarget);
    }, []);

    return (
        <Box sx={{ position: "absolute", top: 6, left: 6, zIndex: 2, pointerEvents: "auto" }}>
            <Tooltip title="Technical info" {...tooltipProps}>
                <IconButton size="small" onClick={handleClick} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                    <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                </IconButton>
            </Tooltip>
            <Popover
                open={!!anchor}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                container={portalContainer.current}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            >
                <Box sx={{ p: 2, minWidth: 180 }}>
                    {children}
                </Box>
            </Popover>
        </Box>
    );
};
