import MoreVertIcon from "@mui/icons-material/MoreVert";
import { IconButton, ListItemText, Menu, MenuItem } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useState } from "react";

type TrackMenuProps = {
    onPlayNext: () => void;
    /** The playlist that was changed last, which is where tracks are most likely to go: one tap less than the dialog. */
    lastPlaylist?: { id: string; name: string };
    onAddToLastPlaylist: () => void;
    onAddToPlaylist: () => void;
    onPlayAlbumFromHere: () => void;
};

/** The "more" menu of a track row: what is done less often than adding it to the queue. */
export const TrackMenu: React.FC<TrackMenuProps> = ({
    onPlayNext,
    lastPlaylist,
    onAddToLastPlaylist,
    onAddToPlaylist,
    onPlayAlbumFromHere,
}) => {
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
                <MenuItem onClick={choose(onPlayNext)}>
                    <ListItemText>Play next</ListItemText>
                </MenuItem>
                {lastPlaylist && (
                    <MenuItem onClick={choose(onAddToLastPlaylist)}>
                        <ListItemText>Add to "{lastPlaylist.name}"</ListItemText>
                    </MenuItem>
                )}
                <MenuItem onClick={choose(onAddToPlaylist)}>
                    <ListItemText>Add to playlist...</ListItemText>
                </MenuItem>
                <MenuItem onClick={choose(onPlayAlbumFromHere)}>
                    <ListItemText>Play album from here</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
};
