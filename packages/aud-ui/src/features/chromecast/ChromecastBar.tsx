import { Box, ButtonBase, LinearProgress, Paper, Slider, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppSelector } from "../../hooks";
import { AlbumCover } from "../library/AlbumCover";
import { formatDuration } from "../library/libraryFormat";
import { NOW_PLAYING_PATH } from "../player/nowPlayingPath";
import { selectChromecastPlayback, selectChromecastState } from "./chromecastSelectors";
import { chromecastSubtitle } from "./chromecastText";
import { ChromecastTransport } from "./ChromecastTransport";
import { CommandErrorSnackbar } from "./CommandErrorSnackbar";
import { useChromecastCommand } from "./useChromecastCommand";
import { useChromecastPosition } from "./useChromecastPosition";

const COVER_SIZE = 48;
const WIDE_SLIDER_MIN_WIDTH = 160;

/**
 * What the Chromecast plays and the buttons for it, in the place of the player bar while the amplifier is on the Chromecast.
 * The text opens the full screen view (the same page as the player's, which shows the Chromecast then).
 */
export const ChromecastBar: React.FC = () => {
    const app = useAppSelector(selectChromecastState)?.app ?? null;
    const playback = useAppSelector(selectChromecastPlayback);
    const position = useChromecastPosition();
    const { send, error, clearError } = useChromecastCommand();
    const { pathname } = useLocation();
    const theme = useTheme();
    const wide = useMediaQuery(theme.breakpoints.up("md"));
    const [dragging, setDragging] = useState<number | undefined>(undefined);
    if (!playback || pathname === NOW_PLAYING_PATH) return null;

    const duration = playback.durationSec ?? 0;
    const shown = Math.min(dragging ?? position, duration || Infinity);

    const text = (
        <ButtonBase
            component={Link}
            to={NOW_PLAYING_PATH}
            sx={{ minWidth: 0, flex: 1, textAlign: "left", display: "flex", gap: 1.5, justifyContent: "flex-start" }}
        >
            <Box sx={{ width: COVER_SIZE, flexShrink: 0 }}>
                <AlbumCover collection="music" albumId="" hasCover={!!playback.coverUrl} imageUrl={playback.coverUrl} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap sx={{ fontWeight: 600 }}>
                    {playback.title}
                </Typography>
                <Typography noWrap variant="body2" color="text.secondary">
                    {chromecastSubtitle(app, playback)}
                </Typography>
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
                    <ChromecastTransport playback={playback} send={send} />
                </Stack>
                <CommandErrorSnackbar error={error} onClose={clearError} />
            </Paper>
        );
    }

    return (
        <Paper elevation={6} sx={{ px: 2, py: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ display: "flex", width: "30%", minWidth: 0 }}>{text}</Box>
                <ChromecastTransport playback={playback} send={send} />
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: WIDE_SLIDER_MIN_WIDTH }}>
                    <Typography variant="caption" color="text.secondary" sx={{ width: 40, textAlign: "right" }}>
                        {formatDuration(Math.floor(shown))}
                    </Typography>
                    <Slider
                        size="small"
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
                    <Typography variant="caption" color="text.secondary" sx={{ width: 40 }}>
                        {duration ? formatDuration(duration) : ""}
                    </Typography>
                </Stack>
            </Stack>
            <CommandErrorSnackbar error={error} onClose={clearError} />
        </Paper>
    );
};
