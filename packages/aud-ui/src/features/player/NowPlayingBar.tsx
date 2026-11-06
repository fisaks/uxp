import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import RepeatIcon from "@mui/icons-material/Repeat";
import RepeatOneIcon from "@mui/icons-material/RepeatOne";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import {
    Box,
    Button,
    ButtonBase,
    IconButton,
    LinearProgress,
    Paper,
    Slider,
    Stack,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { REPEAT_MODES } from "@aud/common";
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppSelector } from "../../hooks";
import { AlbumCover } from "../library/AlbumCover";
import { TrackCover } from "../library/TrackCover";
import { formatDuration } from "../library/libraryFormat";
import { NOW_PLAYING_PATH } from "./nowPlayingPath";
import { BookSkipButton } from "./BookSkipButton";
import { BookSpeedButton } from "./BookSpeedButton";
import { nowPlayingText } from "./nowPlayingText";
import { PlayPauseButton } from "./PlayPauseButton";
import { PlayerToggleButton } from "./PlayerToggleButton";
import { selectCurrentTrack, selectPlayerState, selectSpotify } from "./playerSelectors";
import { REPEAT_LABELS } from "./repeatLabels";
import { usePlayerCommand } from "./usePlayerCommand";
import { usePlayerPosition } from "./usePlayerPosition";

const COVER_SIZE = 48;
const WIDE_SLIDER_MIN_WIDTH = 160;

/**
 * What is playing and the buttons to control it, fixed at the bottom of the window and only there while the queue has tracks.
 * On a wide screen it is one row with everything; on a narrow one the cover, the text, play/pause and next, and a line for the
 * place in the track. The text opens the queue on a wide screen and the full screen player on a narrow one.
 */
export const NowPlayingBar: React.FC = () => {
    const state = useAppSelector(selectPlayerState);
    const position = usePlayerPosition();
    const send = usePlayerCommand();
    const { pathname } = useLocation();
    const theme = useTheme();
    const wide = useMediaQuery(theme.breakpoints.up("md"));
    const [dragging, setDragging] = useState<number | undefined>(undefined);
    const track = useAppSelector(selectCurrentTrack);
    const spotify = useAppSelector(selectSpotify);
    // The full screen player has all the buttons itself.
    if (!state || (!track && !spotify) || pathname === NOW_PLAYING_PATH) return null;

    // The amplifier may be starting up and the file loading: the position does not move until the sound is there.
    const loading = !spotify && state.status === "starting";
    const duration = spotify ? spotify.durationSec : (track?.durationSec ?? 0);
    const shown = Math.min(dragging ?? position, duration || Infinity);
    const nextRepeat = REPEAT_MODES[(REPEAT_MODES.indexOf(state.repeat) + 1) % REPEAT_MODES.length];

    // What Spotify plays is not in the queue: it has no shuffle, repeat or queue of its own here.
    const { title, subtitle, isBook } = spotify
        ? { title: spotify.title, subtitle: spotify.artist, isBook: false }
        : nowPlayingText(state.queue, state.currentIndex ?? 0);
    const modes = spotify
        ? []
        : [
              loading && "Loading...",
              state.shuffle && "Shuffle on",
              state.repeat === "all" && "Repeat all",
              state.repeat === "one" && "Repeat this track",
          ].filter(Boolean);

    const text = (
        <ButtonBase
            component={Link}
            to={wide ? "/queue" : NOW_PLAYING_PATH}
            sx={{ minWidth: 0, flex: 1, textAlign: "left", display: "flex", gap: 1.5, justifyContent: "flex-start" }}
        >
            <Box sx={{ width: COVER_SIZE, flexShrink: 0 }}>
                {spotify ? (
                    <AlbumCover collection="music" albumId="" hasCover={!!spotify.coverUrl} imageUrl={spotify.coverUrl} banner="Spotify" />
                ) : (
                    track && <TrackCover track={track} />
                )}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap sx={{ fontWeight: 600 }}>
                    {title}
                </Typography>
                <Typography noWrap variant="body2" color="text.secondary">
                    {subtitle}
                </Typography>
                {wide && modes.length > 0 && (
                    <Typography noWrap variant="caption" color="primary">
                        {modes.join(" · ")}
                    </Typography>
                )}
            </Box>
        </ButtonBase>
    );

    if (!wide) {
        return (
            <Paper elevation={6} square>
                <LinearProgress
                    variant="determinate"
                    value={duration ? Math.min(100, (100 * shown) / duration) : 0}
                    sx={{ height: 3 }}
                    aria-label="Position"
                />
                <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 0.5 }}>
                    {text}
                    <PlayPauseButton />
                    <IconButton onClick={() => send("player_next", {})} aria-label="Next">
                        <SkipNextIcon />
                    </IconButton>
                </Stack>
            </Paper>
        );
    }

    return (
        <Paper elevation={6} sx={{ px: 2, py: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ display: "flex", width: "30%", minWidth: 0 }}>{text}</Box>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    {!isBook && !spotify && (
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
                    {isBook && <BookSkipButton direction="back" />}
                    <PlayPauseButton />
                    {isBook && <BookSkipButton direction="forward" />}
                    <IconButton onClick={() => send("player_next", {})} aria-label="Next">
                        <SkipNextIcon />
                    </IconButton>
                    {!isBook && !spotify && (
                        <PlayerToggleButton
                            active={state.repeat !== "off"}
                            label={REPEAT_LABELS[state.repeat]}
                            onClick={() => send("player_set_repeat", { mode: nextRepeat })}
                        >
                            {state.repeat === "one" ? <RepeatOneIcon /> : <RepeatIcon />}
                        </PlayerToggleButton>
                    )}
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: WIDE_SLIDER_MIN_WIDTH }}>
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
                {isBook && <BookSpeedButton />}
                <Button component={Link} to="/queue" size="small" startIcon={<QueueMusicIcon />}>
                    {isBook ? "Book" : spotify ? "Queue" : `Queue (${state.queue.length})`}
                </Button>
            </Stack>
        </Paper>
    );
};
