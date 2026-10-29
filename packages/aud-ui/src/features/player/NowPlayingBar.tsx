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
import { PlayerToggleButton } from "./PlayerToggleButton";
import { selectPlayerState } from "./playerSlice";
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

    const track = state && state.currentIndex !== undefined ? state.queue[state.currentIndex] : undefined;
    if (!state || !track) return null;

    const playing = state.status === "playing";
    // The amplifier may be starting up and the file loading: the position does not move until the sound is there.
    const starting = state.status === "starting";
    const duration = track.durationSec ?? 0;
    const shown = Math.min(dragging ?? position, duration || Infinity);
    const nextRepeat = REPEAT_MODES[(REPEAT_MODES.indexOf(state.repeat) + 1) % REPEAT_MODES.length];

    const modes = [
        starting && "Starting...",
        state.shuffle && "Shuffle on",
        state.repeat === "all" && "Repeat all",
        state.repeat === "one" && "Repeat this track",
    ].filter(Boolean);

    return (
        <Paper elevation={6} sx={{ position: "sticky", bottom: 0, zIndex: 2, mt: 2, px: 2, py: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ width: COVER_SIZE, flexShrink: 0 }}>
                    <AlbumCover albumId={track.albumId} hasCover={track.hasCover} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontWeight: 600 }}>
                        {track.title}
                    </Typography>
                    <Typography noWrap variant="body2" color="text.secondary">
                        {track.artist}
                    </Typography>
                    <Typography noWrap variant="caption" color="primary">
                        {modes.join(" · ")}
                    </Typography>
                </Box>
                <Button component={Link} to="/queue" size="small" startIcon={<QueueMusicIcon />}>
                    Queue ({state.queue.length})
                </Button>
            </Stack>
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                <PlayerToggleButton
                    active={state.shuffle}
                    label={state.shuffle ? "Shuffle is on, press to turn it off" : "Shuffle is off, press to turn it on"}
                    onClick={() => send("player_set_shuffle", { on: !state.shuffle })}
                >
                    <ShuffleIcon />
                </PlayerToggleButton>
                <IconButton onClick={() => send("player_previous", {})} aria-label="Previous">
                    <SkipPreviousIcon />
                </IconButton>
                <IconButton
                    color="primary"
                    size="large"
                    onClick={() => send(playing || starting ? "player_pause" : "player_resume", {})}
                    aria-label={starting ? "Starting, press to cancel" : playing ? "Pause" : "Play"}
                >
                    {starting ? (
                        <CircularProgress size={35} />
                    ) : playing ? (
                        <PauseIcon fontSize="large" />
                    ) : (
                        <PlayArrowIcon fontSize="large" />
                    )}
                </IconButton>
                <IconButton onClick={() => send("player_next", {})} aria-label="Next">
                    <SkipNextIcon />
                </IconButton>
                <PlayerToggleButton
                    active={state.repeat !== "off"}
                    label={REPEAT_LABELS[state.repeat]}
                    onClick={() => send("player_set_repeat", { mode: nextRepeat })}
                >
                    {state.repeat === "one" ? <RepeatOneIcon /> : <RepeatIcon />}
                </PlayerToggleButton>
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
                    disabled={!duration || starting}
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
