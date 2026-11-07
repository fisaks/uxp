import { Box, Slider, Stack, Typography } from "@mui/material";
import React, { useState } from "react";
import { AlbumCover } from "../library/AlbumCover";
import { songSubtitle } from "../player/nowPlayingText";
import { formatDuration } from "../library/libraryFormat";
import { useAppSelector } from "../../hooks";
import { selectChromecastPlayback, selectChromecastState } from "./chromecastSelectors";
import { chromecastSubtitle } from "./chromecastText";
import { NOW_PLAYING_COVER_WIDTH } from "../player/nowPlayingCover";
import { UpNextLine } from "../player/UpNextLine";
import { ChromecastTransport } from "./ChromecastTransport";
import { CommandErrorSnackbar } from "./CommandErrorSnackbar";
import { useChromecastCommand } from "./useChromecastCommand";
import { useChromecastPosition } from "./useChromecastPosition";

export const PAGE_WIDTH = 480;

/** What the Chromecast plays at full size: the cover, the place in the media that can be moved when the app allows it, and the buttons. */
export const ChromecastNowPlaying: React.FC = () => {
    const app = useAppSelector(selectChromecastState)?.app ?? null;
    const playback = useAppSelector(selectChromecastPlayback);
    const position = useChromecastPosition();
    const { send, error, clearError } = useChromecastCommand();
    const [dragging, setDragging] = useState<number | undefined>(undefined);
    if (!playback) return null;
    const next = playback.upcoming?.[0];

    const duration = playback.durationSec ?? 0;
    const shown = Math.min(dragging ?? position, duration || Infinity);

    return (
        <Stack spacing={2} sx={{ maxWidth: PAGE_WIDTH, mx: "auto", width: "100%" }}>
            <Box sx={{ width: NOW_PLAYING_COVER_WIDTH, alignSelf: "center" }}>
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
            <Stack spacing={0}>
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
            </Stack>
            <UpNextLine text={next && songSubtitle(next.title, next.artist ?? "")} />
            <CommandErrorSnackbar error={error} onClose={clearError} />
        </Stack>
    );
};
