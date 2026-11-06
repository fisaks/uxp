import MoreVertIcon from "@mui/icons-material/MoreVert";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import { Button, IconButton, ListItemText, Menu, MenuItem, Stack } from "@mui/material";
import React, { useState } from "react";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { useNavigate } from "react-router-dom";
import { usePlayerActions } from "../player/usePlayerActions";
import { searchPagePath } from "../search/searchPath";

type AlbumActionsProps = {
    artistName: string;
    trackIds: string[];
    onAddToPlaylist: () => void;
    onSetGain: () => void;
};

/** What can be done with a whole album: play it or play it mixed, and in the menu put it in the queue or a playlist, or set how loud it is played, or search for more from the artist. */
export const AlbumActions: React.FC<AlbumActionsProps> = ({ artistName, trackIds, onAddToPlaylist, onSetGain }) => {
    const { playTracks, shuffleTracks, enqueue } = usePlayerActions();
    const navigate = useNavigate();
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
                <MenuItem onClick={choose(onSetGain)}>
                    <ListItemText>Gain...</ListItemText>
                </MenuItem>
                <MenuItem onClick={choose(() => navigate(searchPagePath(artistName)))}>
                    <ListItemText>More from {artistName}</ListItemText>
                </MenuItem>
            </Menu>
        </Stack>
    );
};
