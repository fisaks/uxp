import Forward30Icon from "@mui/icons-material/Forward30";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Replay30Icon from "@mui/icons-material/Replay30";
import StopIcon from "@mui/icons-material/Stop";
import { Alert, Box, ButtonBase, Paper, Slider, Snackbar, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { CastSession } from "@vid/common";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useHomeVideos } from "../home-video/HomeVideosProvider";
import { clipPath } from "../home-video/ClipTile";
import { clipName, formatDuration } from "../home-video/clipFormat";
import { LabelledIconButton } from "../shared/LabelledIconButton";
import { PAGE_WIDTH } from "../shared/pageWidth";
import { useCast } from "./CastProvider";
import { sessionPosition, sessionStateText } from "./castText";

const SKIP_SECONDS = 30;
const TICK_MS = 1000;
/** The room the bar takes at the bottom of the page, per row, for the page to keep its end clear. */
export const CAST_ROW_ROOM = 64;

const useNow = (active: boolean) => {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        if (!active) return;
        const timer = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(timer);
    }, [active]);
    return now;
};

const SessionRow: React.FC<{ session: CastSession; now: number }> = ({ session, now }) => {
    const { clips } = useHomeVideos();
    const { play, pause, stop, seek } = useCast();
    const theme = useTheme();
    const wide = useMediaQuery(theme.breakpoints.up("md"));
    const [dragging, setDragging] = useState<number | undefined>(undefined);
    const clip = clips?.find((c) => c.id === session.clipId);
    const title = clip ? clipName(clip) : session.title;
    const duration = session.durationSec;
    const position = Math.min(dragging ?? sessionPosition(session, now), duration || Infinity);
    const playing = session.state === "PLAYING" || session.state === "BUFFERING";
    const ended = session.state === "ENDED" || session.state === "FAILED";

    return (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: CAST_ROW_ROOM }}>
            <ButtonBase
                component={Link}
                to={clipPath(session.clipId)}
                sx={{ minWidth: 0, flex: wide ? "0 0 30%" : 1, display: "block", textAlign: "left" }}
            >
                <Typography noWrap sx={{ fontWeight: 600 }}>
                    {title}
                </Typography>
                <Typography noWrap variant="body2" color="text.secondary">
                    {session.deviceName} · {sessionStateText(session)}
                </Typography>
            </ButtonBase>
            {!ended && (
                <>
                    <LabelledIconButton label={`Back ${SKIP_SECONDS} s`} onClick={() => seek(session.deviceId, Math.max(0, position - SKIP_SECONDS))}>
                        <Replay30Icon />
                    </LabelledIconButton>
                    <LabelledIconButton
                        label={playing ? "Pause" : "Play"}
                        onClick={() => (playing ? pause(session.deviceId) : play(session.deviceId))}
                    >
                        {playing ? <PauseIcon /> : <PlayArrowIcon />}
                    </LabelledIconButton>
                    <LabelledIconButton label={`Forward ${SKIP_SECONDS} s`} onClick={() => seek(session.deviceId, position + SKIP_SECONDS)}>
                        <Forward30Icon />
                    </LabelledIconButton>
                    {wide && (
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 160 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ width: 40, textAlign: "right" }}>
                                {formatDuration(position)}
                            </Typography>
                            <Slider
                                size="small"
                                min={0}
                                max={duration || 1}
                                value={duration ? position : 0}
                                disabled={!duration}
                                onChange={(_event, value) => setDragging(value as number)}
                                onChangeCommitted={(_event, value) => {
                                    setDragging(undefined);
                                    void seek(session.deviceId, value as number);
                                }}
                                aria-label="Position"
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ width: 40 }}>
                                {duration ? formatDuration(duration) : ""}
                            </Typography>
                        </Stack>
                    )}
                </>
            )}
            <LabelledIconButton label="Stop" onClick={() => stop(session.deviceId)}>
                <StopIcon />
            </LabelledIconButton>
        </Stack>
    );
};

/** What the Chromecasts play and the buttons for them: one row for each device with a clip. Only on the video pages. */
export const CastBar: React.FC = () => {
    const { state, error, clearError } = useCast();
    const sessions = state?.sessions ?? [];
    const now = useNow(sessions.some((s) => s.state === "PLAYING"));

    return (
        <>
            {sessions.length > 0 && (
                <Paper elevation={6} square sx={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: (t) => t.zIndex.appBar - 1 }}>
                    <Box sx={{ maxWidth: PAGE_WIDTH, mx: "auto", px: { xs: 1.5, sm: 2 } }}>
                        {sessions.map((session) => (
                            <SessionRow key={session.deviceId} session={session} now={now} />
                        ))}
                    </Box>
                </Paper>
            )}
            <Snackbar open={error !== undefined} autoHideDuration={6000} onClose={clearError}>
                <Alert severity="error" onClose={clearError}>
                    {error}
                </Alert>
            </Snackbar>
        </>
    );
};
