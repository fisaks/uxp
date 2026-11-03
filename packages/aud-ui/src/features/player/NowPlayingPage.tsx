import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import RepeatIcon from "@mui/icons-material/Repeat";
import RepeatOneIcon from "@mui/icons-material/RepeatOne";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import { Box, Button, IconButton, Slider, Stack, Typography } from "@mui/material";
import { REPEAT_MODES } from "@aud/common";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAppSelector } from "../../hooks";
import { AlbumCover } from "../library/AlbumCover";
import { formatDuration } from "../library/libraryFormat";
import { BookSkipButton } from "./BookSkipButton";
import { BookSpeedButton } from "./BookSpeedButton";
import { nowPlayingText } from "./nowPlayingText";
import { PlayPauseButton } from "./PlayPauseButton";
import { PlayerToggleButton } from "./PlayerToggleButton";
import { selectCurrentTrack, selectPlayerState } from "./playerSelectors";
import { REPEAT_LABELS } from "./repeatLabels";
import { usePlayerCommand } from "./usePlayerCommand";
import { usePlayerPosition } from "./usePlayerPosition";

const PAGE_WIDTH = 480;
// The room the rest of the page and the bars above it take, so that the cover is as large as fits with everything on the screen.
const ROOM_BESIDES_COVER = 440;
const MIN_COVER_SIZE = 120;

/**
 * The full screen player, opened from the mini player on a narrow screen: a large cover, the place in the track that can be
 * moved, all the buttons and the way to the queue.
 */
const NowPlayingPage: React.FC = () => {
    const state = useAppSelector(selectPlayerState);
    const track = useAppSelector(selectCurrentTrack);
    const position = usePlayerPosition();
    const send = usePlayerCommand();
    const [dragging, setDragging] = useState<number | undefined>(undefined);

    if (!state || !track || state.currentIndex === undefined) {
        return (
            <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
                Nothing is playing.
            </Typography>
        );
    }

    // The amplifier may be starting up and the file loading: the position does not move until the sound is there.
    const loading = state.status === "starting";
    const duration = track.durationSec ?? 0;
    const shown = Math.min(dragging ?? position, duration || Infinity);
    const nextRepeat = REPEAT_MODES[(REPEAT_MODES.indexOf(state.repeat) + 1) % REPEAT_MODES.length];
    const { title, subtitle, isBook } = nowPlayingText(state.queue, state.currentIndex);

    return (
        <Stack spacing={2} sx={{ maxWidth: PAGE_WIDTH, mx: "auto", px: 2 }}>
            <Box sx={{ width: `min(100%, max(${MIN_COVER_SIZE}px, calc(100dvh - ${ROOM_BESIDES_COVER}px)))`, alignSelf: "center" }}>
                <AlbumCover collection={track.collection} albumId={track.albumId} hasCover={track.hasCover} />
            </Box>
            <Box sx={{ textAlign: "center" }}>
                <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                    {title}
                </Typography>
                <Typography color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                    {subtitle}
                </Typography>
                {loading && (
                    <Typography variant="caption" color="primary">
                        Loading...
                    </Typography>
                )}
            </Box>
            <Box>
                <Slider
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
                <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                        {formatDuration(Math.floor(shown))}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {duration ? formatDuration(duration) : ""}
                    </Typography>
                </Stack>
            </Box>
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
                    <SkipPreviousIcon fontSize="large" />
                </IconButton>
                {isBook && <BookSkipButton direction="back" fontSize="large" />}
                <PlayPauseButton />
                {isBook && <BookSkipButton direction="forward" fontSize="large" />}
                <IconButton onClick={() => send("player_next", {})} aria-label="Next">
                    <SkipNextIcon fontSize="large" />
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
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                {isBook && <BookSpeedButton />}
                <Button component={Link} to="/queue" startIcon={<QueueMusicIcon />}>
                    {isBook ? "Book" : `Queue (${state.queue.length})`}
                </Button>
            </Stack>
        </Stack>
    );
};

export default NowPlayingPage;
