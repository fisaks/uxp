import Forward30Icon from "@mui/icons-material/Forward30";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Replay30Icon from "@mui/icons-material/Replay30";
import StopIcon from "@mui/icons-material/Stop";
import { Alert, Box, ButtonBase, LinearProgress, Paper, Slider, Snackbar, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { CastSession } from "@vid/common";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useHomeVideos } from "../home-video/HomeVideosProvider";
import { thumbnailUrl } from "../../api/home-video-api";
import { clipPath } from "../home-video/ClipTile";
import { clipName, formatDuration } from "../home-video/clipFormat";
import { LabelledIconButton } from "../shared/LabelledIconButton";
import { PAGE_WIDTH } from "../shared/pageWidth";
import { useCast } from "./CastProvider";
import { sessionPosition, sessionStateText } from "./castText";

const SKIP_SECONDS = 30;
const TICK_MS = 1000;
/** The room the bar takes at the bottom of the page, per row, for the page to keep its end clear. */
export const CAST_ROW_ROOM = 80;
/** The line with the position below the row, where the row has no room for the slider. */
const POSITION_LINE_HEIGHT = 24;
const POSTER_WIDE = { width: 64, height: 36 };
/** Smaller where the buttons leave little room for the title. */
const POSTER_NARROW = { width: 48, height: 27 };

const useNow = (active: boolean) => {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        if (!active) return;
        const timer = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(timer);
    }, [active]);
    return now;
};

const SessionRow: React.FC<{ session: CastSession; now: number; compact: boolean }> = ({ session, now, compact }) => {
    const { clips } = useHomeVideos();
    const { play, pause, stop, seek, restart } = useCast();
    const theme = useTheme();
    const wide = useMediaQuery(theme.breakpoints.up("md")) && !compact;
    const [dragging, setDragging] = useState<number | undefined>(undefined);
    const clip = clips?.find((c) => c.id === session.clipId);
    const title = clip ? clipName(clip) : session.title;
    const duration = session.durationSec;
    const position = Math.min(dragging ?? sessionPosition(session, now), duration || Infinity);
    const playing = session.state === "PLAYING" || session.state === "BUFFERING";
    const ended = session.state === "ENDED" || session.state === "FAILED";

    // Without room for the slider on the row the position gets a line of its own below it, with the times at both ends.
    const ownLine = !wide && !ended;

    return (
        <Box>
            <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ minHeight: ownLine ? CAST_ROW_ROOM - POSITION_LINE_HEIGHT : CAST_ROW_ROOM }}
            >
                <ButtonBase
                    {...(compact ? {} : { component: Link, to: clipPath(session.clipId) })}
                    disabled={compact}
                    sx={{
                        minWidth: 0,
                        // Wide: a column of its own, so poster and title start at the same place on every row. Narrow: all the room the buttons leave.
                        flex: wide ? "0 0 40%" : 1,
                        display: "flex",
                        justifyContent: "flex-start",
                        alignItems: "center",
                        gap: 1.5,
                        textAlign: "left",
                    }}
                >
                    <Box
                        component="img"
                        src={thumbnailUrl(session.clipId)}
                        alt=""
                        sx={{ ...(wide ? POSTER_WIDE : POSTER_NARROW), flexShrink: 0, objectFit: "cover", borderRadius: 0.5 }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography noWrap sx={{ fontWeight: 600 }}>
                            {title}
                        </Typography>
                        <Typography noWrap variant="body2" color="text.secondary">
                            {session.deviceName} · {sessionStateText(session)}
                        </Typography>
                    </Box>
                </ButtonBase>
                {!ended && (
                    <>
                        <LabelledIconButton
                            label={`Back ${SKIP_SECONDS} s`}
                            onClick={() => seek(session.deviceId, Math.max(0, position - SKIP_SECONDS))}
                        >
                            <Replay30Icon />
                        </LabelledIconButton>
                        <LabelledIconButton
                            label={playing ? "Pause" : "Play"}
                            onClick={() => (playing ? pause(session.deviceId) : play(session.deviceId))}
                        >
                            {playing ? <PauseIcon /> : <PlayArrowIcon />}
                        </LabelledIconButton>
                        <LabelledIconButton
                            label={`Forward ${SKIP_SECONDS} s`}
                            onClick={() => seek(session.deviceId, position + SKIP_SECONDS)}
                        >
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
                {!ended && (
                    <LabelledIconButton label="Restart the stream" onClick={() => restart(session.deviceId)}>
                        <RestartAltIcon />
                    </LabelledIconButton>
                )}
                <LabelledIconButton label="Stop" onClick={() => stop(session.deviceId)}>
                    <StopIcon />
                </LabelledIconButton>
            </Stack>
            {ownLine && (
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ height: POSITION_LINE_HEIGHT }}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36, textAlign: "right" }}>
                        {formatDuration(position)}
                    </Typography>
                    {compact ? (
                        <LinearProgress variant="determinate" value={duration ? (position / duration) * 100 : 0} sx={{ flex: 1 }} />
                    ) : (
                        <Slider
                            size="small"
                            sx={{ flex: 1, py: 0 }}
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
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36 }}>
                        {duration ? formatDuration(duration) : ""}
                    </Typography>
                </Stack>
            )}
        </Box>
    );
};

/** One row for each device with a clip. Compact is for the narrow System Center panel: no link to the clip page, a progress bar that cannot be dragged. */
export const CastRows: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    const { state } = useCast();
    const sessions = state?.sessions ?? [];
    const now = useNow(sessions.some((s) => s.state === "PLAYING"));
    return (
        <>
            {sessions.map((session) => (
                <SessionRow key={session.deviceId} session={session} now={now} compact={compact} />
            ))}
        </>
    );
};

/** The text of a failed command. */
export const CastErrorNotice: React.FC = () => {
    const { error, clearError } = useCast();
    return (
        <Snackbar open={error !== undefined} autoHideDuration={6000} onClose={clearError}>
            <Alert severity="error" onClose={clearError}>
                {error}
            </Alert>
        </Snackbar>
    );
};

/** What the Chromecasts play and the buttons for them. Only on the video pages. */
export const CastBar: React.FC = () => {
    const { state } = useCast();
    const sessionCount = state?.sessions.length ?? 0;

    return (
        <>
            {sessionCount > 0 && (
                <Paper elevation={6} square sx={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: (t) => t.zIndex.appBar - 1 }}>
                    <Box sx={{ maxWidth: PAGE_WIDTH, mx: "auto", px: { xs: 1.5, sm: 2 } }}>
                        <CastRows />
                    </Box>
                </Paper>
            )}
            <CastErrorNotice />
        </>
    );
};
