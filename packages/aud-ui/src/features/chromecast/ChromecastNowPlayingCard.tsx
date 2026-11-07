import { Box, Card, CardContent, LinearProgress, Stack, Typography } from "@mui/material";
import React from "react";
import { useAppSelector } from "../../hooks";
import { AlbumCover } from "../library/AlbumCover";
import { formatDuration } from "../library/libraryFormat";
import { NowPlayingPanel } from "../shared/NowPlayingPanel";
import { selectChromecastPlayback, selectChromecastState } from "./chromecastSelectors";
import { ChromecastTransport } from "./ChromecastTransport";
import { CommandErrorSnackbar } from "./CommandErrorSnackbar";
import { useChromecastCommand } from "./useChromecastCommand";
import { useChromecastPosition } from "./useChromecastPosition";

const COVER_SIZE = 64;

/**
 * What the Chromecast plays, with the buttons the app supports, for the narrow System Center panel. The position is only
 * shown: a slider in a panel that is scrolled with a finger would be moved by accident.
 */
export const ChromecastNowPlayingCard: React.FC = () => {
    const app = useAppSelector(selectChromecastState)?.app ?? null;
    const playback = useAppSelector(selectChromecastPlayback);
    const position = useChromecastPosition();
    const { send, error, clearError } = useChromecastCommand();
    if (!playback) return null;

    const duration = playback.durationSec ?? 0;
    const shown = Math.min(position, duration || Infinity);

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    {app ?? "Chromecast"}
                </Typography>
                <NowPlayingPanel
                    leading={
                        <Box sx={{ width: COVER_SIZE, flexShrink: 0 }}>
                            <AlbumCover collection="music" albumId="" hasCover={!!playback.coverUrl} imageUrl={playback.coverUrl} />
                        </Box>
                    }
                    title={playback.title}
                    subtitle={playback.artist}
                />
                <Box sx={{ mt: 1 }}>
                    <ChromecastTransport playback={playback} send={send} />
                </Box>
                {duration > 0 && (
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography variant="caption" color="text.secondary" sx={{ width: 40, textAlign: "right" }}>
                            {formatDuration(Math.floor(shown))}
                        </Typography>
                        <LinearProgress variant="determinate" value={(100 * shown) / duration} sx={{ flex: 1 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ width: 40 }}>
                            {formatDuration(duration)}
                        </Typography>
                    </Stack>
                )}
                <CommandErrorSnackbar error={error} onClose={clearError} />
            </CardContent>
        </Card>
    );
};
