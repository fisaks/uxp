import Forward30Icon from "@mui/icons-material/Forward30";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RepeatIcon from "@mui/icons-material/Repeat";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Replay30Icon from "@mui/icons-material/Replay30";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import StopIcon from "@mui/icons-material/Stop";
import {
    Alert,
    Box,
    ButtonBase,
    LinearProgress,
    Paper,
    Slide,
    Slider,
    Snackbar,
    Stack,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { CastSessionSnapshot } from "@vid/common";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGetClipsQuery } from "../home-video/home-video.api";
import { thumbnailUrl } from "../../api/home-video-api";
import { clipPath } from "../home-video/ClipTile";
import { clipName, formatDuration } from "../home-video/clipFormat";
import { LabelledIconButton } from "../shared/LabelledIconButton";
import { ToggleIconButton } from "../shared/ToggleIconButton";
import { PAGE_WIDTH } from "../shared/pageWidth";
import { useAppSelector } from "../../hooks";
import { selectQueued } from "./castSelectors";
import { useCast } from "./useCast";
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

const SessionRow: React.FC<{ session: CastSessionSnapshot; now: number; compact: boolean }> = ({ session, now, compact }) => {
    const { data: clips } = useGetClipsQuery();
    const { play, pause, stop, seek, restart, next, editQueue } = useCast();
    const theme = useTheme();
    const wide = useMediaQuery(theme.breakpoints.up("md")) && !compact;
    const [dragging, setDragging] = useState<number | undefined>(undefined);
    const clip = clips?.find((c) => c.id === session.clipId);
    const title = clip ? clipName(clip) : session.title;
    const duration = session.durationSec;
    const position = Math.min(dragging ?? sessionPosition(session, now), duration || Infinity);
    const playing = session.state === "PLAYING" || session.state === "BUFFERING";
    const ended = session.state === "ENDED" || session.state === "FAILED";
    const { queue } = session;
    const inQueue = queue.clipIds.length > 1;

    // Without room for the slider on the row the position gets a line of its own below it, with the times at both ends.
    const ownLine = !wide && !ended;

    const buttons = (
        <>
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
                    <LabelledIconButton label={`Forward ${SKIP_SECONDS} s`} onClick={() => seek(session.deviceId, position + SKIP_SECONDS)}>
                        <Forward30Icon />
                    </LabelledIconButton>
                    {inQueue && (
                        <LabelledIconButton label="Next clip" onClick={() => next(session.deviceId)}>
                            <SkipNextIcon />
                        </LabelledIconButton>
                    )}
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
            {inQueue && !ended && (
                <ToggleIconButton
                    active={queue.repeat}
                    label={queue.repeat ? "Repeat the queue: on" : "Repeat the queue: off"}
                    onClick={() => editQueue(session.deviceId, { action: "repeat", repeat: !queue.repeat })}
                >
                    <RepeatIcon />
                </ToggleIconButton>
            )}
            {!ended && (
                <LabelledIconButton label="Restart the stream" onClick={() => restart(session.deviceId)}>
                    <RestartAltIcon />
                </LabelledIconButton>
            )}
            <LabelledIconButton label="Stop" onClick={() => stop(session.deviceId)}>
                <StopIcon />
            </LabelledIconButton>
        </>
    );

    return (
        <Box>
            <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ minHeight: compact ? 56 : ownLine ? CAST_ROW_ROOM - POSITION_LINE_HEIGHT : CAST_ROW_ROOM }}
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
                            {inQueue && ` · ${queue.index + 1} / ${queue.clipIds.length}`}
                        </Typography>
                    </Box>
                </ButtonBase>
                {!compact && buttons}
            </Stack>
            {compact && !ended && (
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    {buttons}
                </Stack>
            )}
            {compact && ended && (
                <Stack direction="row" justifyContent="flex-end">
                    {buttons}
                </Stack>
            )}
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
        <Snackbar open={error !== undefined} autoHideDuration={6000} onClose={(_event, reason) => reason !== "clickaway" && clearError()}>
            <Alert severity="error" onClose={clearError}>
                {error}
            </Alert>
        </Snackbar>
    );
};

const BANNER_SHOW_MS = 2500;

/** The clips just put in a queue, flying in above the bar and out again. The same place on screen as the bar, where the eye is. */
const QueuedBanner: React.FC = () => {
    const queued = useAppSelector(selectQueued);
    const { data: clips } = useGetClipsQuery();
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (!queued) return;
        setOpen(true);
        const timer = setTimeout(() => setOpen(false), BANNER_SHOW_MS);
        return () => clearTimeout(timer);
    }, [queued?.id]);

    const clip = clips?.find((c) => c.id === queued?.clipIds[0]);
    const count = queued?.clipIds.length ?? 0;
    return (
        <Slide in={open} direction="up" mountOnEnter unmountOnExit>
            <Paper elevation={8} square sx={{ borderTop: 2, borderColor: "primary.main" }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.75 }}>
                    {queued && (
                        <Box
                            component="img"
                            src={thumbnailUrl(queued.clipIds[0])}
                            alt=""
                            sx={{ ...POSTER_WIDE, flexShrink: 0, objectFit: "cover", borderRadius: 0.5 }}
                        />
                    )}
                    <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 600 }}>
                            {count > 1 ? `${count} clips` : clip ? clipName(clip) : ""}
                        </Typography>
                        <Typography noWrap variant="body2" color="text.secondary">
                            {queued?.text}
                        </Typography>
                    </Box>
                </Stack>
            </Paper>
        </Slide>
    );
};

/** What the Chromecasts play and the buttons for them. Only on the video pages. */
export const CastBar: React.FC = () => {
    const { state } = useCast();
    const sessionCount = state?.sessions.length ?? 0;

    return (
        <>
            <Box sx={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: (t) => t.zIndex.appBar - 1 }}>
                <Box sx={{ maxWidth: PAGE_WIDTH, mx: "auto", px: { xs: 1.5, sm: 2 } }}>
                    <QueuedBanner />
                </Box>
                {sessionCount > 0 && (
                    <Paper elevation={6} square>
                        <Box sx={{ maxWidth: PAGE_WIDTH, mx: "auto", px: { xs: 1.5, sm: 2 } }}>
                            <CastRows />
                        </Box>
                    </Paper>
                )}
            </Box>
            <CastErrorNotice />
        </>
    );
};
