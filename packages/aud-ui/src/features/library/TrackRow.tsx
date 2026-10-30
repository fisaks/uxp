import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import { IconButton, ListItem, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import { LibraryTrack } from "@aud/common";
import React from "react";
import { formatDuration } from "./libraryFormat";
import { TrackMenu } from "./TrackMenu";

type TrackRowProps = {
    track: LibraryTrack;
    /** Shown under the title when the performer is not the artist of the album. */
    artistName: string;
    playing: boolean;
    onPress: () => void;
    onAddToQueue: () => void;
    onPlayNext: () => void;
    lastPlaylist?: { id: string; name: string };
    onAddToLastPlaylist: () => void;
    onAddToPlaylist: () => void;
    onPlayAlbumFromHere: () => void;
};

// The room for the length and the two buttons at the right of the row.
const ROOM_FOR_BUTTONS = 16;

/** A track of an album: pressing it plays it, the + puts it in the queue, and the menu has the rest. */
export const TrackRow: React.FC<TrackRowProps> = ({ track, artistName, playing, onPress, onAddToQueue, ...menu }) => (
    <ListItem
        disablePadding
        divider
        secondaryAction={
            <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography color="text.secondary" sx={{ mr: 0.5 }}>
                    {track.durationSec ? formatDuration(track.durationSec) : ""}
                </Typography>
                <IconButton size="small" aria-label="Add to queue" onClick={onAddToQueue}>
                    <PlaylistAddIcon fontSize="small" />
                </IconButton>
                <TrackMenu {...menu} />
            </Stack>
        }
    >
        <ListItemButton selected={playing} onClick={onPress} sx={{ pr: ROOM_FOR_BUTTONS }}>
            <Typography color="text.secondary" sx={{ width: 32, flexShrink: 0 }}>
                {track.trackNo ?? ""}
            </Typography>
            <ListItemText
                primary={track.title}
                secondary={track.artist !== artistName ? track.artist : undefined}
                slotProps={{ primary: { sx: { overflowWrap: "anywhere", fontWeight: playing ? 600 : undefined } } }}
            />
        </ListItemButton>
    </ListItem>
);
