import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import RepeatIcon from "@mui/icons-material/Repeat";
import RepeatOneIcon from "@mui/icons-material/RepeatOne";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import { Box, Button, IconButton, Link as MuiLink, Slider, Stack, Typography } from "@mui/material";
import { REPEAT_MODES } from "@aud/common";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAppSelector } from "../../hooks";
import { selectChromecastActive } from "../chromecast/chromecastSelectors";
import { ChromecastNowPlaying } from "../chromecast/ChromecastNowPlaying";
import { AlbumCover } from "../library/AlbumCover";
import { TrackCover } from "../library/TrackCover";
import { formatDuration } from "../library/libraryFormat";
import { BookSkipButton } from "./BookSkipButton";
import { BookSpeedButton } from "./BookSpeedButton";
import { GainButtons } from "./GainButtons";
import { nowPlayingText, songSubtitle } from "./nowPlayingText";
import { PlayPauseButton } from "./PlayPauseButton";
import { PlayerToggleButton } from "./PlayerToggleButton";
import { selectCurrentTrack, selectPlayerState, selectSpotify } from "./playerSelectors";
import { REPEAT_LABELS } from "./repeatLabels";
import { searchPagePath } from "../search/searchPath";
import { usePlayerCommand } from "./usePlayerCommand";
import { usePlayerPosition } from "./usePlayerPosition";

const PAGE_WIDTH = 480;
// The room the rest of the page and the bars above it take, so that the cover is as large as fits with everything on the screen.
const ROOM_BESIDES_COVER = 440;
const MIN_COVER_SIZE = 120;

/**
 * The full screen player, opened from the text of the player bar: a large cover, the place in the track that can be
 * moved, all the buttons, the gain of a song and the way to the queue. While the amplifier is on the Chromecast it shows
 * what the Chromecast plays instead.
 */
const NowPlayingPage: React.FC = () => {
    const chromecastActive = useAppSelector(selectChromecastActive);
    return chromecastActive ? (
        <Box sx={{ px: 2 }}>
            <ChromecastNowPlaying />
        </Box>
    ) : (
        <PlayerNowPlaying />
    );
};

const PlayerNowPlaying: React.FC = () => {
    const state = useAppSelector(selectPlayerState);
    const track = useAppSelector(selectCurrentTrack);
    const spotify = useAppSelector(selectSpotify);
    const position = usePlayerPosition();
    const send = usePlayerCommand();
    const [dragging, setDragging] = useState<number | undefined>(undefined);

    if (!state || (!spotify && (!track || state.currentIndex === undefined))) {
        return (
            <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
                Nothing is playing.
            </Typography>
        );
    }

    // The amplifier may be starting up and the file loading: the position does not move until the sound is there.
    const loading = !spotify && state.status === "starting";
    const duration = spotify ? spotify.durationSec : (track?.durationSec ?? 0);
    const shown = Math.min(dragging ?? position, duration || Infinity);
    const nextRepeat = REPEAT_MODES[(REPEAT_MODES.indexOf(state.repeat) + 1) % REPEAT_MODES.length];
    // What Spotify plays is not in the queue: it has no shuffle, repeat or queue of its own here.
    const { title, subtitle, isBook } = spotify
        ? { title: spotify.title, subtitle: songSubtitle(spotify.artist, spotify.album), isBook: false }
        : nowPlayingText(state.queue, state.currentIndex ?? 0);
    // A song of the library links to its album, a song of Spotify to a search for its performer.
    const subtitleTo = isBook
        ? undefined
        : spotify
          ? searchPagePath(spotify.artist)
          : track?.spotify
            ? searchPagePath(track.artist)
            : `/library/album/${track?.albumId}`;

    return (
        <Stack spacing={2} sx={{ maxWidth: PAGE_WIDTH, mx: "auto", px: 2 }}>
            <Box sx={{ width: `min(100%, max(${MIN_COVER_SIZE}px, calc(100dvh - ${ROOM_BESIDES_COVER}px)))`, alignSelf: "center" }}>
                {spotify ? (
                    <AlbumCover collection="music" albumId="" hasCover={!!spotify.coverUrl} imageUrl={spotify.coverUrl} banner="Spotify" />
                ) : (
                    track && <TrackCover track={track} />
                )}
            </Box>
            <Box sx={{ textAlign: "center" }}>
                <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                    {title}
                </Typography>
                <Typography color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                    {subtitleTo ? (
                        <MuiLink component={Link} to={subtitleTo} color="inherit" underline="hover">
                            {subtitle}
                        </MuiLink>
                    ) : (
                        subtitle
                    )}
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
                    <SkipPreviousIcon fontSize="large" />
                </IconButton>
                {isBook && <BookSkipButton direction="back" fontSize="large" />}
                <PlayPauseButton />
                {isBook && <BookSkipButton direction="forward" fontSize="large" />}
                <IconButton onClick={() => send("player_next", {})} aria-label="Next">
                    <SkipNextIcon fontSize="large" />
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
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                {isBook && <BookSpeedButton />}
                {!isBook && !spotify && <GainButtons />}
                <Button component={Link} to="/queue" startIcon={<QueueMusicIcon />}>
                    {isBook ? "Book" : spotify ? "Queue" : `Queue (${state.queue.length})`}
                </Button>
            </Stack>
        </Stack>
    );
};

export default NowPlayingPage;
