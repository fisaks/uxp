import { Box, Slider, Stack, Typography } from "@mui/material";
import React, { useState } from "react";
import { AlbumCover } from "../library/AlbumCover";
import { formatDuration } from "../library/libraryFormat";
import { useAppSelector } from "../../hooks";
import { selectChromecastPlayback, selectChromecastState } from "./chromecastSelectors";
import { chromecastSubtitle } from "./chromecastText";
import { ChromecastTransport } from "./ChromecastTransport";
import { CommandErrorSnackbar } from "./CommandErrorSnackbar";
import { useChromecastCommand } from "./useChromecastCommand";
import { useChromecastPosition } from "./useChromecastPosition";

export const PAGE_WIDTH = 480;
// The room the rest of the page and the bars above it take, so that the cover is as large as fits with everything on the screen.
const ROOM_BESIDES_COVER = 440;
const MIN_COVER_SIZE = 120;

/** What the Chromecast plays at full size: the cover, the place in the media that can be moved when the app allows it, and the buttons. */
export const ChromecastNowPlaying: React.FC = () => {
    const app = useAppSelector(selectChromecastState)?.app ?? null;
    const playback = useAppSelector(selectChromecastPlayback);
    const position = useChromecastPosition();
    const { send, error, clearError } = useChromecastCommand();
    const [dragging, setDragging] = useState<number | undefined>(undefined);
    if (!playback) return null;

    const duration = playback.durationSec ?? 0;
    const shown = Math.min(dragging ?? position, duration || Infinity);

    return (
        <Stack spacing={2} sx={{ maxWidth: PAGE_WIDTH, mx: "auto", width: "100%" }}>
            <Box sx={{ width: `min(100%, max(${MIN_COVER_SIZE}px, calc(100dvh - ${ROOM_BESIDES_COVER}px)))`, alignSelf: "center" }}>
                <AlbumCover collection="music" albumId="" hasCover={!!playback.coverUrl} imageUrl={playback.coverUrl} />
            </Box>
            <Box sx={{ textAlign: "center" }}>
                <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                    {playback.title}
                </Typography>
                <Typography color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                    {chromecastSubtitle(app, playback)}
                </Typography>
            </Box>
            <Box>
                <Slider
                    min={0}
                    max={duration || 1}
                    value={duration ? shown : 0}
                    disabled={!duration || !playback.commands.seek}
                    onChange={(_event, value) => setDragging(value as number)}
                    onChangeCommitted={(_event, value) => {
                        setDragging(undefined);
                        void send("chromecast_seek", { positionSec: value as number });
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
            <ChromecastTransport playback={playback} send={send} fontSize="large" />
            <CommandErrorSnackbar error={error} onClose={clearError} />
        </Stack>
    );
};
