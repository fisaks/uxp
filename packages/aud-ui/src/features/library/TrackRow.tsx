import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import { ListItem, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import { LibraryTrack } from "@aud/common";
import React, { ReactNode } from "react";
import { LabelledIconButton } from "../shared/LabelledIconButton";
import { formatDuration } from "./libraryFormat";
import { TrackMenu } from "./TrackMenu";

type TrackRowProps = {
    track: LibraryTrack;
    /** Shown under the title when the performer is not the artist of the album. */
    artistName: string;
    /** Replaces the title and the line under it, for a track that is shown outside its album (the track number is left out then). */
    primary?: ReactNode;
    secondary?: ReactNode;
    playing: boolean;
    onPress: () => void;
    onAddToQueue: () => void;
    onPlayNext: () => void;
    lastPlaylist?: { id: string; name: string };
    onAddToLastPlaylist?: () => void;
    onAddToPlaylist?: () => void;
    /** Left out where the album is not at hand, as in the search results. */
    onPlayAlbumFromHere?: () => void;
};

// The room for the length and the two buttons at the right of the row; on a phone the length is left out.
const ROOM_FOR_BUTTONS = { xs: 12, sm: 16 };

/** A track of an album: pressing it plays it, the + puts it in the queue, and the menu has the rest. */
export const TrackRow: React.FC<TrackRowProps> = ({ track, artistName, primary, secondary, playing, onPress, onAddToQueue, ...menu }) => (
    <ListItem
        disablePadding
        divider
        secondaryAction={
            <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography color="text.secondary" sx={{ mr: 0.5, display: { xs: "none", sm: "block" } }}>
                    {track.durationSec ? formatDuration(track.durationSec) : ""}
                </Typography>
                <LabelledIconButton label="Add to queue" onClick={onAddToQueue}>
                    <PlaylistAddIcon fontSize="small" />
                </LabelledIconButton>
                <TrackMenu {...menu} />
            </Stack>
        }
    >
        <ListItemButton selected={playing} onClick={onPress} sx={{ "&&": { pr: ROOM_FOR_BUTTONS } }}>
            {primary === undefined && (
                <Typography color="text.secondary" sx={{ width: 32, flexShrink: 0 }}>
                    {track.trackNo ?? ""}
                </Typography>
            )}
            <ListItemText
                primary={primary ?? track.title}
                secondary={secondary ?? (track.artist !== artistName ? track.artist : undefined)}
                slotProps={{ primary: { sx: { overflowWrap: "anywhere", fontWeight: playing ? 600 : undefined } } }}
            />
        </ListItemButton>
    </ListItem>
);
