import MoreVertIcon from "@mui/icons-material/MoreVert";
import { IconButton, ListItemText, Menu, MenuItem } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useState } from "react";

type TrackMenuProps = {
    onAddToQueue: () => void;
    onAddToPlaylist: () => void;
};

/** The "more" menu of a track row. */
export const TrackMenu: React.FC<TrackMenuProps> = ({ onAddToQueue, onAddToPlaylist }) => {
    const portalContainer = usePortalContainerRef();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const choose = (action: () => void) => () => {
        setAnchor(null);
        action();
    };
    return (
        <>
            <IconButton size="small" aria-label="More" onClick={(e) => setAnchor(e.currentTarget)}>
                <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)} container={portalContainer.current}>
                <MenuItem onClick={choose(onAddToQueue)}>
                    <ListItemText>Add to queue</ListItemText>
                </MenuItem>
                <MenuItem onClick={choose(onAddToPlaylist)}>
                    <ListItemText>Add to playlist...</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
};
