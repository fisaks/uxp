import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import RepeatIcon from "@mui/icons-material/Repeat";
import RepeatOneIcon from "@mui/icons-material/RepeatOne";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import { Box, Button, CircularProgress, IconButton, Paper, Slider, Stack, Typography } from "@mui/material";
import { REPEAT_MODES, RepeatMode } from "@aud/common";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAppSelector } from "../../hooks";
import { AlbumCover } from "../library/AlbumCover";
import { formatDuration } from "../library/libraryFormat";
import { partNames } from "../audiobook/partNames";
import { PlayerToggleButton } from "./PlayerToggleButton";
import { selectCurrentTrack, selectIsBookQueue, selectPlayerState } from "./playerSelectors";
import { usePlayerCommand } from "./usePlayerCommand";
import { usePlayerPosition } from "./usePlayerPosition";

const COVER_SIZE = 48;
const REPEAT_LABELS: Record<RepeatMode, string> = {
    off: "Repeat is off, press to repeat the whole queue",
    all: "Repeating the whole queue, press to repeat this track",
    one: "Repeating this track, press to turn repeat off",
};

/** What is playing and the buttons to control it. It sticks to the bottom of the page and is only there while the queue has tracks. */
export const NowPlayingBar: React.FC = () => {
    const state = useAppSelector(selectPlayerState);
    const position = usePlayerPosition();
    const send = usePlayerCommand();
    const [dragging, setDragging] = useState<number | undefined>(undefined);
    const track = useAppSelector(selectCurrentTrack);
    const isBook = useAppSelector(selectIsBookQueue);
    if (!state || !track) return null;

    const playing = state.status === "playing";
    // The amplifier may be starting up and the file loading: the position does not move until the sound is there.
    const loading = state.status === "starting";
    const duration = track.durationSec ?? 0;
    const shown = Math.min(dragging ?? position, duration || Infinity);
    const nextRepeat = REPEAT_MODES[(REPEAT_MODES.indexOf(state.repeat) + 1) % REPEAT_MODES.length];

    // While loading the button shows a spinner, and pressing it cancels.
    const playPauseIcon = loading ? (
        <CircularProgress size={35} />
    ) : playing ? (
        <PauseIcon fontSize="large" />
    ) : (
        <PlayArrowIcon fontSize="large" />
    );

    // A book is shown by its title, with the part under it: the file names of its parts say nothing.
    const part = isBook && state.queue.length > 1 ? partNames(state.queue)[state.currentIndex ?? 0] : undefined;
    const modes = [
        loading && "Loading...",
        state.shuffle && "Shuffle on",
        state.repeat === "all" && "Repeat all",
        state.repeat === "one" && "Repeat this track",
    ].filter(Boolean);

    return (
        <Paper elevation={6} sx={{ px: 2, py: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ width: COVER_SIZE, flexShrink: 0 }}>
                    <AlbumCover collection={track.collection} albumId={track.albumId} hasCover={track.hasCover} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontWeight: 600 }}>
                        {isBook ? track.albumTitle : track.title}
                    </Typography>
                    <Typography noWrap variant="body2" color="text.secondary">
                        {[part, track.artist].filter(Boolean).join(" · ")}
                    </Typography>
                    <Typography noWrap variant="caption" color="primary">
                        {modes.join(" · ")}
                    </Typography>
                </Box>
                <Button component={Link} to="/queue" size="small" startIcon={<QueueMusicIcon />}>
                    {isBook ? "Book" : `Queue (${state.queue.length})`}
                </Button>
            </Stack>
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                {!isBook && (
                    <PlayerToggleButton
                        active={state.shuffle}
                        label={state.shuffle ? "Shuffle is on, press to turn it off" : "Shuffle is off, press to turn it on"}
                        onClick={() => send("player_set_shuffle", { on: !state.shuffle })}
                    >
                        <ShuffleIcon />
                    </PlayerToggleButton>
                )}
                <IconButton onClick={() => send("player_previous", {})} aria-label="Previous">
                    <SkipPreviousIcon />
                </IconButton>
                <IconButton
                    color="primary"
                    size="large"
                    onClick={() => send(playing || loading ? "player_pause" : "player_resume", {})}
                    aria-label={loading ? "Loading, press to cancel" : playing ? "Pause" : "Play"}
                >
                    {playPauseIcon}
                </IconButton>
                <IconButton onClick={() => send("player_next", {})} aria-label="Next">
                    <SkipNextIcon />
                </IconButton>
                {!isBook && (
                    <PlayerToggleButton
                        active={state.repeat !== "off"}
                        label={REPEAT_LABELS[state.repeat]}
                        onClick={() => send("player_set_repeat", { mode: nextRepeat })}
                    >
                        {state.repeat === "one" ? <RepeatOneIcon /> : <RepeatIcon />}
                    </PlayerToggleButton>
                )}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1.5}>
                <Typography variant="caption" color="text.secondary" sx={{ width: 40, textAlign: "right" }}>
                    {formatDuration(Math.floor(shown))}
                </Typography>
                <Slider
                    size="small"
                    min={0}
                    max={duration || 1}
                    value={duration ? shown : 0}
                    disabled={!duration || loading}
                    onChange={(_event, value) => setDragging(value as number)}
                    onChangeCommitted={(_event, value) => {
                        setDragging(undefined);
                        void send("player_seek", { positionSec: value as number });
                    }}
                    aria-label="Position"
                />
                <Typography variant="caption" color="text.secondary" sx={{ width: 40 }}>
                    {duration ? formatDuration(duration) : ""}
                </Typography>
            </Stack>
        </Paper>
    );
};
