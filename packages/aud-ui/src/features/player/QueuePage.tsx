import CloseIcon from "@mui/icons-material/Close";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import PauseIcon from "@mui/icons-material/Pause";
import { alpha, Box, Button, IconButton, Stack, Tab, Tabs, Typography } from "@mui/material";
import { QueueTrack, SpotifyNowPlaying } from "@aud/common";
import React, { useMemo, useState } from "react";
import { useAppSelector } from "../../hooks";
import { formatDuration } from "../library/libraryFormat";
import { SpotifyMark } from "../library/SpotifyMark";
import { TrackMenu } from "../library/TrackMenu";
import { AddToPlaylistDialog } from "../playlist/AddToPlaylistDialog";
import { selectMostRecentPlaylist } from "../playlist/playlistSelectors";
import { usePlaylistCommand } from "../playlist/usePlaylistCommand";
import { SortableList, uniqueKeys } from "../shared/SortableList";
import { useRequest } from "../shared/useRequest";
import { partNames } from "../audiobook/partNames";
import { selectIsBookQueue, selectPlayerState } from "./playerSelectors";
import { usePlayerActions } from "./usePlayerActions";
import { usePlayerCommand } from "./usePlayerCommand";

type QueueRow = { track: QueueTrack; key: string };

/** The parts of the audiobook that is the queue. They are only played: they stay as they are, with no handles, no remove and no playlist. */
const BookQueue: React.FC = () => {
    const state = useAppSelector(selectPlayerState);
    const send = usePlayerCommand();
    const { clear } = usePlayerActions();
    if (!state) return null;
    const names = partNames(state.queue);
    const [first] = state.queue;
    return (
        <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                        {first.albumTitle}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {first.artist}
                    </Typography>
                </Box>
                <Button onClick={clear}>Clear</Button>
            </Stack>
            {state.queue.map((part, index) => {
                const current = index === state.currentIndex;
                return (
                    <Box
                        key={part.id}
                        onClick={() => send("player_play_index", { index })}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            borderBottom: 1,
                            borderColor: "divider",
                            bgcolor: current ? "action.selected" : undefined,
                            cursor: "pointer",
                            py: 1,
                            pl: 1,
                        }}
                    >
                        <Box sx={{ width: 28, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                            {current && state.status === "playing" ? <GraphicEqIcon color="primary" fontSize="small" /> : null}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: current ? 600 : undefined }}>{names[index]}</Typography>
                            {part.durationSec ? (
                                <Typography variant="body2" color="text.secondary">
                                    {formatDuration(part.durationSec)}
                                </Typography>
                            ) : null}
                        </Box>
                    </Box>
                );
            })}
        </>
    );
};

const COVER_SIZE = 48;

type Source = "queue" | "spotify";

// The tab that is not shown stays easy to read in dark mode, where the default grey is too dim against the background.
const TAB_SX = { color: "text.primary", opacity: 0.75, "&.Mui-selected": { opacity: 1 } };

/** What Spotify plays next, as far as its player reports it. It is only shown: the Spotify app is where it is changed. */
const SpotifyQueue: React.FC<{ spotify: SpotifyNowPlaying; active: boolean; onContinue: () => void }> = ({
    spotify,
    active,
    onContinue,
}) => {
    const rows = [
        {
            title: spotify.title,
            artist: spotify.artist,
            durationSec: spotify.durationSec,
            coverUrl: spotify.coverUrl,
            current: true,
        },
        ...spotify.upcoming.map((entry) => ({ ...entry, current: false })),
    ];
    return (
        <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6">Spotify queue</Typography>
                    {active ? null : (
                        <Typography variant="body2" color="text.secondary">
                            paused at {formatDuration(Math.round(spotify.positionSec))}
                        </Typography>
                    )}
                </Box>
                {active ? null : <Button onClick={onContinue}>Continue</Button>}
            </Stack>
            {rows.map((row, index) => (
                <Box
                    key={index}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        borderBottom: 1,
                        borderColor: "divider",
                        py: 1,
                        pl: 1,
                        // The track that plays glows: a ring and a soft light in the colour of the theme.
                        ...(row.current && {
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                            borderLeft: 3,
                            borderLeftColor: "primary.main",
                            boxShadow: (theme) => `0 0 14px ${alpha(theme.palette.primary.main, 0.45)}`,
                        }),
                    }}
                >
                    <Box
                        component="img"
                        src={row.coverUrl}
                        alt=""
                        sx={{ width: COVER_SIZE, height: COVER_SIZE, flexShrink: 0, borderRadius: 0.5, mr: 1.5, bgcolor: "action.hover" }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ overflowWrap: "anywhere", fontWeight: row.current ? 600 : undefined }}>{row.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {[row.artist, row.durationSec ? formatDuration(row.durationSec) : undefined].filter(Boolean).join(" · ")}
                        </Typography>
                    </Box>
                    {row.current && active && spotify.status === "playing" ? (
                        <GraphicEqIcon color="primary" fontSize="small" sx={{ mx: 1 }} />
                    ) : null}
                </Box>
            ))}
        </>
    );
};

/** The tracks that will be played, in the order they were added, which can be changed by dragging. The one that is playing is marked. */
const QueuePage: React.FC = () => {
    const state = useAppSelector(selectPlayerState);
    const send = usePlayerCommand();
    const { clear, notify } = usePlayerActions();
    useRequest("playlist_list", {});
    const sendPlaylist = usePlaylistCommand();
    const lastPlaylist = useAppSelector(selectMostRecentPlaylist);
    const isBook = useAppSelector(selectIsBookQueue);
    const [saving, setSaving] = useState<string[] | undefined>(undefined);
    const [chosen, setChosen] = useState<Source | undefined>(undefined);

    const rows = useMemo<QueueRow[]>(() => {
        const queue = state?.queue ?? [];
        const keys = uniqueKeys(queue.map((track) => track.id));
        return queue.map((track, index) => ({ track, key: keys[index] }));
    }, [state?.queue]);

    if (!state) {
        return null;
    }

    // Spotify and the queue never play together: the one that is not the source is paused where it is, and Continue plays it on.
    const spotify = state.spotify ?? state.spotifyIdle;
    const source: Source = state.spotify ? "spotify" : "queue";
    const shown = spotify ? (chosen ?? source) : "queue";
    const switchTo = (to: Source) => {
        send(to === "queue" ? "player_resume_queue" : "player_resume_spotify", {});
        setChosen(undefined);
    };
    // The tab of the one that is the source shows it: the bars move while it plays, a pause sign when it is paused.
    const sourcePlaying = state.spotify ? state.spotify.status === "playing" : state.status === "playing" || state.status === "starting";
    const sourcePaused = state.spotify ? state.spotify.status === "paused" : state.status === "paused";
    const sourceIcon = (tab: Source) =>
        tab !== source ? undefined : sourcePlaying ? (
            <GraphicEqIcon color="primary" fontSize="small" />
        ) : sourcePaused ? (
            <PauseIcon color="primary" fontSize="small" />
        ) : undefined;
    const toggle =
        spotify && state.queue.length > 0 ? (
            <Tabs
                value={shown}
                onChange={(_event, value: Source) => setChosen(value)}
                sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
            >
                <Tab value="queue" label={`Queue (${state.queue.length})`} icon={sourceIcon("queue")} iconPosition="start" sx={TAB_SX} />
                <Tab value="spotify" label="Spotify" icon={sourceIcon("spotify")} iconPosition="start" sx={TAB_SX} />
            </Tabs>
        ) : null;

    if (spotify && shown === "spotify") {
        return (
            <>
                {toggle}
                <SpotifyQueue spotify={spotify} active={source === "spotify"} onContinue={() => switchTo("spotify")} />
            </>
        );
    }

    if (state.queue.length === 0) {
        return <Typography color="text.secondary">The queue is empty. Play something from the Library.</Typography>;
    }

    if (isBook) {
        return <BookQueue />;
    }

    const current = state.currentIndex === undefined ? undefined : state.queue[state.currentIndex];
    const addToLastPlaylist = async (track: QueueTrack) => {
        if (lastPlaylist && (await sendPlaylist("playlist_add_tracks", { id: lastPlaylist.id, trackIds: [track.id] }))) {
            notify(`Added "${track.title}" to "${lastPlaylist.name}"`);
        }
    };
    return (
        <>
            {toggle}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Box>
                    <Typography variant="h6">Queue, {state.queue.length} tracks</Typography>
                    {source === "spotify" && current ? (
                        <Typography variant="body2" color="text.secondary">
                            paused at {formatDuration(Math.round(state.positionSec))} in {current.title}
                        </Typography>
                    ) : null}
                </Box>
                <Stack direction="row">
                    {source === "spotify" ? <Button onClick={() => switchTo("queue")}>Continue</Button> : null}
                    <Button startIcon={<LibraryAddIcon />} onClick={() => setSaving(state.queue.map((track) => track.id))}>
                        Save as playlist
                    </Button>
                    <Button onClick={clear}>Clear</Button>
                </Stack>
            </Stack>
            <SortableList
                items={rows}
                getKey={(row) => row.key}
                onMove={(from, to) => send("player_move", { from, to })}
                renderItem={({ track }, _displayIndex, handle) => {
                    // The place in the queue is where the track is for the server: after a drag the list shows it before the server has answered.
                    const index = state.queue.indexOf(track);
                    const current = index === state.currentIndex;
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
                            <Box sx={{ width: 28, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                                {current && state.status === "playing" ? <GraphicEqIcon color="primary" fontSize="small" /> : null}
                            </Box>
                            <Box
                                onClick={() => send("player_play_index", { index })}
                                sx={{ flex: 1, minWidth: 0, py: 1, cursor: "pointer" }}
                            >
                                <Typography sx={{ overflowWrap: "anywhere", fontWeight: current ? 600 : undefined }}>
                                    {track.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {track.spotify && <SpotifyMark />}
                                    {[track.artist, track.durationSec ? formatDuration(track.durationSec) : undefined, track.gainDb ? `+${track.gainDb} dB` : undefined]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </Typography>
                            </Box>
                            <IconButton size="small" aria-label="Remove from the queue" onClick={() => send("player_remove", { index })}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                            <TrackMenu
                                lastPlaylist={lastPlaylist}
                                onAddToLastPlaylist={() => addToLastPlaylist(track)}
                                onAddToPlaylist={() => setSaving([track.id])}
                            />
                        </Box>
                    );
                }}
            />
            <AddToPlaylistDialog trackIds={saving} title={saving?.length === 1 ? "Add to a playlist" : "Save the queue as a playlist"} onClose={() => setSaving(undefined)} />
        </>
    );
};

export default QueuePage;
