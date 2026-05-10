import MoreVertIcon from "@mui/icons-material/MoreVert";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, useTheme } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useCallback, useMemo, useState } from "react";

type TileContextMenuProps = {
    /** Called when "Schedule..." is selected. */
    onSchedule?: () => void;
};

/**
 * Context menu (⋮) for location tiles. Top-left corner.
 * Currently offers "Schedule..." to open the schedule creator with this view pre-selected.
 * Designed for future context actions (user keywords, rename, etc.).
 * Hidden when there are no menu items to show.
 */
export const TileContextMenu: React.FC<TileContextMenuProps> = ({ onSchedule }) => {
    const [anchor, setAnchor] = useState<null | HTMLElement>(null);
    const portalContainer = usePortalContainerRef();

    const hasItems = useMemo(() => !!onSchedule, [onSchedule]);
    const theme = useTheme();
    const open = useCallback((e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        e.preventDefault();
        setAnchor(e.currentTarget);
    }, []);

    const close = useCallback(() => setAnchor(null), []);

    const handleOpenSchedule = useCallback(() => {
        close();
        onSchedule?.();
    }, [onSchedule, close]);

    if (!hasItems) return null;

    return (
        <>
            <IconButton
                size="small"
                onClick={open}
                sx={{
                    position: "absolute",
                    top: 4,
                    left: 4,
                    zIndex: 1,
                    opacity: 0.5,
                    "&:hover": { opacity: 1 },
                    p: 0.3,

                }}
            >
                <MoreVertIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={close}
                container={portalContainer.current}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}

            >
                {onSchedule && (
                    <MenuItem onClick={handleOpenSchedule}>
                        <ListItemIcon>
                            <CalendarMonthIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                        </ListItemIcon>
                        <ListItemText sx={{ color: (theme.typography.h2 as React.CSSProperties).color ?? theme.palette.text.primary }}>Schedule...</ListItemText>
                    </MenuItem>
                )}
            </Menu>
        </>
    );
};
