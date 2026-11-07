import Forward30Icon from "@mui/icons-material/Forward30";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Replay30Icon from "@mui/icons-material/Replay30";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import { ChromecastPlayback } from "@aud/common";
import { CircularProgress, IconButton, Stack } from "@mui/material";
import React from "react";
import { SendChromecastCommand } from "./useChromecastCommand";
import { useChromecastPosition } from "./useChromecastPosition";

const SKIP_SEC = 30;

type ChromecastTransportProps = {
    playback: ChromecastPlayback;
    send: SendChromecastCommand;
    fontSize?: "medium" | "large";
};

/**
 * The buttons the running app supports: previous and next for a music app, 30 seconds back and forward for an app that can
 * only seek (a book, a video), and always play or pause.
 */
export const ChromecastTransport: React.FC<ChromecastTransportProps> = ({ playback, send, fontSize }) => {
    const position = useChromecastPosition();
    const { commands } = playback;
    const playing = playback.state === "PLAYING";
    const buffering = playback.state === "BUFFERING";
    const skipSeconds = commands.seek && !commands.next && !commands.previous;
    const seekBy = (seconds: number) => {
        const target = Math.max(0, position + seconds);
        return send("chromecast_seek", { positionSec: playback.durationSec ? Math.min(target, playback.durationSec) : target });
    };

    return (
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
            {commands.previous && (
                <IconButton onClick={() => send("chromecast_previous", {})} aria-label="Previous">
                    <SkipPreviousIcon fontSize={fontSize} />
                </IconButton>
            )}
            {skipSeconds && (
                <IconButton onClick={() => seekBy(-SKIP_SEC)} aria-label="Back 30 seconds">
                    <Replay30Icon fontSize={fontSize} />
                </IconButton>
            )}
            <IconButton
                color="primary"
                size="large"
                disabled={!commands.pause}
                onClick={() => send(playing || buffering ? "chromecast_pause" : "chromecast_play", {})}
                aria-label={buffering ? "Loading, press to pause" : playing ? "Pause" : "Play"}
            >
                {buffering ? <CircularProgress size={35} /> : playing ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
            </IconButton>
            {skipSeconds && (
                <IconButton onClick={() => seekBy(SKIP_SEC)} aria-label="Forward 30 seconds">
                    <Forward30Icon fontSize={fontSize} />
                </IconButton>
            )}
            {commands.next && (
                <IconButton onClick={() => send("chromecast_next", {})} aria-label="Next">
                    <SkipNextIcon fontSize={fontSize} />
                </IconButton>
            )}
        </Stack>
    );
};
