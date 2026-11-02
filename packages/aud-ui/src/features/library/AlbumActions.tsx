import MoreVertIcon from "@mui/icons-material/MoreVert";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import { Button, IconButton, ListItemText, Menu, MenuItem, Stack } from "@mui/material";
import React, { useState } from "react";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { usePlayerActions } from "../player/usePlayerActions";

type AlbumActionsProps = {
    trackIds: string[];
    onAddToPlaylist: () => void;
};

/** What can be done with a whole album: play it or play it mixed, and in the menu put it in the queue or a playlist. */
export const AlbumActions: React.FC<AlbumActionsProps> = ({ trackIds, onAddToPlaylist }) => {
    const { playTracks, shuffleTracks, enqueue } = usePlayerActions();
    const portalContainer = usePortalContainerRef();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const choose = (action: () => void) => () => {
        setAnchor(null);
        action();
    };
    return (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => playTracks(trackIds)}>
                Play
            </Button>
            <Button variant="outlined" startIcon={<ShuffleIcon />} onClick={() => shuffleTracks(trackIds)}>
                Shuffle
            </Button>
            <IconButton aria-label="More" onClick={(e) => setAnchor(e.currentTarget)}>
                <MoreVertIcon />
            </IconButton>
            <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)} container={portalContainer.current}>
                <MenuItem onClick={choose(() => enqueue(trackIds))}>
                    <ListItemText>Add to queue</ListItemText>
                </MenuItem>
                <MenuItem onClick={choose(onAddToPlaylist)}>
                    <ListItemText>Add to playlist...</ListItemText>
                </MenuItem>
            </Menu>
        </Stack>
    );
};
