import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListSubheader,
    Stack,
    Typography,
} from "@mui/material";
import { LibraryTrack } from "@aud/common";
import React from "react";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../../hooks";
import { selectPlayerState } from "../player/playerSlice";
import { SendPlayerCommand, usePlayerCommand } from "../player/usePlayerCommand";
import { AlbumCover } from "./AlbumCover";
import { formatDuration } from "./libraryFormat";
import { LibraryBreadcrumbs } from "./LibraryBreadcrumbs";
import { useLibraryRequest } from "./useLibraryRequest";

const COVER_SIZE = 120;

/** The tracks of one disc, or of the whole album when it has a single disc. */
const groupByDisc = (tracks: LibraryTrack[]): { disc?: number; tracks: LibraryTrack[] }[] => {
    const discs = [...new Set(tracks.map((track) => track.discNo))];
    return discs.length > 1 ? discs.map((disc) => ({ disc, tracks: tracks.filter((track) => track.discNo === disc) })) : [{ tracks }];
};

type AlbumActionsProps = {
    trackIds: string[];
    send: SendPlayerCommand;
};

const AlbumActions: React.FC<AlbumActionsProps> = ({ trackIds, send }) => (
    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
        <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => send("player_play_tracks", { trackIds })}>
            Play
        </Button>
        <Button
            variant="outlined"
            startIcon={<ShuffleIcon />}
            onClick={async () => {
                await send("player_set_shuffle", { on: true });
                await send("player_play_tracks", { trackIds });
            }}
        >
            Shuffle
        </Button>
        <Button variant="outlined" startIcon={<PlaylistAddIcon />} onClick={() => send("player_enqueue", { trackIds })}>
            Add to queue
        </Button>
    </Stack>
);

export const TracksView: React.FC = () => {
    const { albumId = "" } = useParams();
    const { data, error } = useLibraryRequest("library_get_tracks", { albumId });
    const send = usePlayerCommand();
    const player = useAppSelector(selectPlayerState);
    const playingId = player?.currentIndex !== undefined ? player.queue[player.currentIndex]?.id : undefined;

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return <CircularProgress size={24} />;

    const { artist, album, tracks } = data;
    const trackIds = tracks.map((track) => track.id);
    const totalSeconds = tracks.reduce((sum, track) => sum + (track.durationSec ?? 0), 0);

    return (
        <>
            <LibraryBreadcrumbs
                trail={[
                    { label: "Library", to: "/library" },
                    { label: artist.name, to: `/library/artist/${artist.id}` },
                ]}
                current={album.title}
            />
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Box sx={{ width: COVER_SIZE, flexShrink: 0 }}>
                    <AlbumCover albumId={album.id} hasCover={album.hasCover} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" sx={{ overflowWrap: "anywhere" }}>
                        {album.title}
                    </Typography>
                    <Typography color="text.secondary">
                        {[artist.name, album.year, `${tracks.length} tracks`, totalSeconds > 0 && formatDuration(totalSeconds)]
                            .filter(Boolean)
                            .join(" · ")}
                    </Typography>
                    <AlbumActions trackIds={trackIds} send={send} />
                </Box>
            </Stack>
            {groupByDisc(tracks).map(({ disc, tracks: discTracks }) => (
                <List
                    key={disc ?? "all"}
                    disablePadding
                    subheader={disc === undefined ? undefined : <ListSubheader disableGutters>Disc {disc}</ListSubheader>}
                >
                    {discTracks.map((track) => (
                        <ListItem
                            key={track.id}
                            disablePadding
                            divider
                            secondaryAction={
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <Typography color="text.secondary">
                                        {track.durationSec ? formatDuration(track.durationSec) : ""}
                                    </Typography>
                                    <IconButton
                                        size="small"
                                        onClick={() => send("player_enqueue", { trackIds: [track.id] })}
                                        aria-label="Add to queue"
                                    >
                                        <PlaylistAddIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            }
                        >
                            <ListItemButton
                                selected={track.id === playingId}
                                onClick={() => send("player_play_tracks", { trackIds, startIndex: trackIds.indexOf(track.id) })}
                                sx={{ pr: 12 }}
                            >
                                <Typography color="text.secondary" sx={{ width: 32, flexShrink: 0 }}>
                                    {track.trackNo ?? ""}
                                </Typography>
                                <ListItemText
                                    primary={track.title}
                                    secondary={track.artist !== artist.name ? track.artist : undefined}
                                    slotProps={{
                                        primary: { sx: { overflowWrap: "anywhere", fontWeight: track.id === playingId ? 600 : undefined } },
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            ))}
        </>
    );
};
