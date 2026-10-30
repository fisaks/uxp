import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import { Button, Stack } from "@mui/material";
import React from "react";
import { usePlayerActions } from "../player/usePlayerActions";

type AlbumActionsProps = {
    trackIds: string[];
    onAddToPlaylist: () => void;
};

/** What can be done with a whole album: play it, play it mixed, or put it in the queue or a playlist. */
export const AlbumActions: React.FC<AlbumActionsProps> = ({ trackIds, onAddToPlaylist }) => {
    const { playTracks, shuffleTracks, enqueue } = usePlayerActions();
    return (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
            <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => playTracks(trackIds)}>
                Play
            </Button>
            <Button variant="outlined" startIcon={<ShuffleIcon />} onClick={() => shuffleTracks(trackIds)}>
                Shuffle
            </Button>
            <Button variant="outlined" startIcon={<PlaylistAddIcon />} onClick={() => enqueue(trackIds)}>
                Add to queue
            </Button>
            <Button variant="outlined" startIcon={<LibraryAddIcon />} onClick={onAddToPlaylist}>
                Add to playlist
            </Button>
        </Stack>
    );
};
