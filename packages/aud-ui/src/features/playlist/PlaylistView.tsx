import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Stack,
    Typography,
} from "@mui/material";
import { PlaylistEntry } from "@aud/common";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppSelector } from "../../hooks";
import { formatDuration } from "../library/libraryFormat";
import { LibraryBreadcrumbs } from "../library/LibraryBreadcrumbs";
import { selectPlayerState } from "../player/playerSlice";
import { usePlayerCommand } from "../player/usePlayerCommand";
import { SortableList, uniqueKeys } from "../shared/SortableList";
import { useRequest } from "../shared/useRequest";
import { NamePlaylistDialog } from "./NamePlaylistDialog";
import { usePlaylistCommand } from "./usePlaylistCommand";

type PlaylistRow = { entry: PlaylistEntry; key: string };

export const PlaylistView: React.FC = () => {
    const navigate = useNavigate();
    const portalContainer = usePortalContainerRef();
    const { id = "" } = useParams();
    const { data: playlist, error, setData } = useRequest("playlist_get", { id });
    const send = usePlaylistCommand();
    const sendToPlayer = usePlayerCommand();
    const player = useAppSelector(selectPlayerState);
    const playingId = player?.currentIndex !== undefined ? player.queue[player.currentIndex]?.id : undefined;
    const [renaming, setRenaming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const rows = useMemo<PlaylistRow[]>(() => {
        const entries = playlist?.entries ?? [];
        const keys = uniqueKeys(entries.map((entry) => entry.id));
        return entries.map((entry, index) => ({ entry, key: keys[index] }));
    }, [playlist]);

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!playlist) return <CircularProgress size={24} />;

    // The tracks that are in the library: what is played. A missing track is skipped.
    const trackIds = rows.flatMap(({ entry }) => (entry.track ? [entry.track.id] : []));
    const totalSeconds = rows.reduce((sum, { entry }) => sum + (entry.track?.durationSec ?? 0), 0);
    // Places are the ones the server knows: after a drag the list shows a track before the server has answered.
    const placeOf = (entry: PlaylistEntry) => playlist.entries.indexOf(entry);
    const playablePlaceOf = (entry: PlaylistEntry) => playlist.entries.slice(0, placeOf(entry)).filter((earlier) => earlier.track).length;

    const change = async <A extends "playlist_rename" | "playlist_add_tracks" | "playlist_remove_track" | "playlist_move_track">(
        ...args: Parameters<typeof send<A>>
    ) => {
        const changed = await send(...args);
        if (changed) setData(changed as typeof playlist);
        return changed !== undefined;
    };
    const remove = async () => {
        setDeleting(false);
        if (await send("playlist_delete", { id: playlist.id })) navigate("/playlists");
    };

    return (
        <>
            <LibraryBreadcrumbs trail={[{ label: "Playlists", to: "/playlists" }]} current={playlist.name} />
            <Typography variant="h5" sx={{ overflowWrap: "anywhere" }}>
                {playlist.name}
            </Typography>
            <Typography color="text.secondary">
                {[`${rows.length} ${rows.length === 1 ? "track" : "tracks"}`, totalSeconds > 0 && formatDuration(totalSeconds)]
                    .filter(Boolean)
                    .join(" · ")}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ my: 1.5 }} flexWrap="wrap" useFlexGap>
                <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    disabled={trackIds.length === 0}
                    onClick={() => sendToPlayer("player_play_tracks", { trackIds })}
                >
                    Play
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<ShuffleIcon />}
                    disabled={trackIds.length === 0}
                    onClick={async () => {
                        await sendToPlayer("player_set_shuffle", { on: true });
                        await sendToPlayer("player_play_tracks", { trackIds });
                    }}
                >
                    Shuffle
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<PlaylistAddIcon />}
                    disabled={trackIds.length === 0}
                    onClick={() => sendToPlayer("player_enqueue", { trackIds })}
                >
                    Add to queue
                </Button>
                <Button onClick={() => setRenaming(true)}>Rename</Button>
                <Button color="error" onClick={() => setDeleting(true)}>
                    Delete
                </Button>
            </Stack>
            {rows.length === 0 && (
                <Typography color="text.secondary">The playlist is empty. Add tracks from the Library, or save the queue here.</Typography>
            )}
            <SortableList
                items={rows}
                getKey={(row) => row.key}
                onMove={(from, to) => change("playlist_move_track", { id: playlist.id, from, to })}
                renderItem={({ entry }, _displayIndex, handle) => {
                    const track = entry.track;
                    const current = track !== undefined && track.id === playingId;
                    return (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                borderBottom: 1,
                                borderColor: "divider",
                                bgcolor: current ? "action.selected" : undefined,
                            }}
                        >
                            {handle}
                            <Box
                                onClick={
                                    track
                                        ? () => sendToPlayer("player_play_tracks", { trackIds, startIndex: playablePlaceOf(entry) })
                                        : undefined
                                }
                                sx={{ flex: 1, minWidth: 0, py: 1, px: 1, cursor: track ? "pointer" : "default" }}
                            >
                                <Typography
                                    sx={{ overflowWrap: "anywhere", fontWeight: current ? 600 : undefined }}
                                    color={track ? "text.primary" : "text.disabled"}
                                >
                                    {track ? track.title : entry.name}
                                </Typography>
                                <Typography variant="body2" color={track ? "text.secondary" : "text.disabled"}>
                                    {track ? track.artist : "Missing from the library"}
                                </Typography>
                            </Box>
                            <Typography color="text.secondary" sx={{ mr: 0.5 }}>
                                {track?.durationSec ? formatDuration(track.durationSec) : ""}
                            </Typography>
                            <IconButton
                                size="small"
                                aria-label="Remove from the playlist"
                                onClick={() => change("playlist_remove_track", { id: playlist.id, index: placeOf(entry) })}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    );
                }}
            />
            <NamePlaylistDialog
                open={renaming}
                title="Rename the playlist"
                initialName={playlist.name}
                submitLabel="Rename"
                onSubmit={async (name) => {
                    setRenaming(false);
                    await change("playlist_rename", { id: playlist.id, name });
                }}
                onClose={() => setRenaming(false)}
            />
            <Dialog open={deleting} onClose={() => setDeleting(false)} container={portalContainer.current}>
                <DialogTitle>Delete the playlist</DialogTitle>
                <DialogContent>
                    <DialogContentText>Delete "{playlist.name}"? The tracks stay in the library.</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleting(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={remove}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
