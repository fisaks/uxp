import Forward30Icon from "@mui/icons-material/Forward30";
import OpenInBrowserIcon from "@mui/icons-material/OpenInBrowser";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RepeatIcon from "@mui/icons-material/Repeat";
import Replay30Icon from "@mui/icons-material/Replay30";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import StopIcon from "@mui/icons-material/Stop";
import { Box, ButtonBase, Slider, Stack, Typography } from "@mui/material";
import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { thumbnailUrl } from "../../api/home-video-api";
import { clipName, formatDuration } from "../home-video/clipFormat";
import { clipPath } from "../home-video/ClipTile";
import { useGetClipsQuery } from "../home-video/home-video.api";
import { LabelledIconButton } from "../shared/LabelledIconButton";
import { PAGE_WIDTH } from "../shared/pageWidth";
import { SavePlaylistButton } from "../playlist/SavePlaylistButton";
import { ToggleIconButton } from "../shared/ToggleIconButton";
import { QueueList } from "./QueueList";
import { PLAYER_TAB_ID } from "../browser-player/browserPlayerLink";
import { useBrowserPlayer } from "../browser-player/useBrowserPlayer";
import { sessionPosition, sessionStateText } from "./castText";
import { useCast } from "./useCast";
import { useNow } from "./useNow";

const SKIP_SECONDS = 30;

/** What one Chromecast plays: the clip big, the buttons and the position, and the queue to reorder, jump in and remove from. */
export const PlayerPage: React.FC = () => {
    const { deviceId = "" } = useParams();
    const navigate = useNavigate();
    const { state, play, pause, stop, seek, next, editQueue } = useCast();
    const { show: showPlayerTab } = useBrowserPlayer();
    const { data: clips } = useGetClipsQuery();
    const session = state?.sessions.find((s) => s.deviceId === deviceId);
    const now = useNow(session?.state === "PLAYING");
    const [dragging, setDragging] = useState<number | undefined>(undefined);

    if (!session) {
        return (
            <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: PAGE_WIDTH, mx: "auto" }}>
                <Typography color="text.secondary">{state ? "Nothing plays here." : "Loading..."}</Typography>
            </Box>
        );
    }

    const { queue } = session;
    const clip = clips?.find((c) => c.id === session.clipId);
    const duration = session.durationSec;
    const position = Math.min(dragging ?? sessionPosition(session, now), duration || Infinity);
    const playing = session.state === "PLAYING" || session.state === "BUFFERING";
    const ended = session.state === "ENDED" || session.state === "FAILED";
    const inQueue = queue.clipIds.length > 1;

    const stopAndLeave = async () => {
        if (await stop(deviceId)) navigate(-1);
    };

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: PAGE_WIDTH, mx: "auto" }}>
            <ButtonBase
                component={Link}
                to={clipPath(session.clipId)}
                sx={{ display: "block", width: "100%", maxWidth: 720, mx: "auto", borderRadius: 1, overflow: "hidden" }}
            >
                <Box
                    component="img"
                    src={thumbnailUrl(session.clipId)}
                    alt=""
                    sx={{ display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: "cover", bgcolor: "action.hover" }}
                />
            </ButtonBase>
            <Box sx={{ maxWidth: 720, mx: "auto", mt: 1.5 }}>
                <Typography variant="h6" noWrap>
                    {clip ? clipName(clip) : session.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                    {session.deviceName} · {sessionStateText(session)}
                    {inQueue && ` · ${queue.index + 1} / ${queue.clipIds.length}`}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36, textAlign: "right" }}>
                        {formatDuration(position)}
                    </Typography>
                    <Slider
                        size="small"
                        min={0}
                        max={duration || 1}
                        value={duration ? position : 0}
                        disabled={!duration || ended}
                        onChange={(_event, value) => setDragging(value as number)}
                        onChangeCommitted={(_event, value) => {
                            setDragging(undefined);
                            void seek(deviceId, value as number);
                        }}
                        aria-label="Position"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36 }}>
                        {duration ? formatDuration(duration) : ""}
                    </Typography>
                </Stack>
                <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                    {!ended && (
                        <>
                            <LabelledIconButton
                                label={`Back ${SKIP_SECONDS} s`}
                                onClick={() => seek(deviceId, Math.max(0, position - SKIP_SECONDS))}
                            >
                                <Replay30Icon />
                            </LabelledIconButton>
                            <LabelledIconButton
                                label={playing ? "Pause" : "Play"}
                                onClick={() => (playing ? pause(deviceId) : play(deviceId))}
                            >
                                {playing ? <PauseIcon /> : <PlayArrowIcon />}
                            </LabelledIconButton>
                            <LabelledIconButton label={`Forward ${SKIP_SECONDS} s`} onClick={() => seek(deviceId, position + SKIP_SECONDS)}>
                                <Forward30Icon />
                            </LabelledIconButton>
                        </>
                    )}
                    {inQueue && !ended && (
                        <LabelledIconButton label="Next clip" onClick={() => next(deviceId)}>
                            <SkipNextIcon />
                        </LabelledIconButton>
                    )}
                    <ToggleIconButton
                        active={queue.repeat}
                        label={queue.repeat ? "Repeat the queue: on" : "Repeat the queue: off"}
                        onClick={() => editQueue(deviceId, { action: "repeat", repeat: !queue.repeat })}
                    >
                        <RepeatIcon />
                    </ToggleIconButton>
                    {deviceId === PLAYER_TAB_ID && (
                        <LabelledIconButton label="Show the player tab" onClick={showPlayerTab}>
                            <OpenInBrowserIcon />
                        </LabelledIconButton>
                    )}
                    <LabelledIconButton label="Stop" onClick={stopAndLeave}>
                        <StopIcon />
                    </LabelledIconButton>
                </Stack>
            </Box>

            {inQueue && (
                <Box sx={{ maxWidth: 720, mx: "auto", mt: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Queue
                        </Typography>
                        <SavePlaylistButton source={{ deviceId }} />
                    </Stack>
                    <QueueList
                        queue={queue}
                        onJump={(index) => editQueue(deviceId, { action: "jump", index })}
                        onRemove={(index) => editQueue(deviceId, { action: "remove", index })}
                        onMove={(from, to) => editQueue(deviceId, { action: "move", from, to })}
                        onOpenClip={(id) => navigate(clipPath(id))}
                    />
                </Box>
            )}
        </Box>
    );
};
