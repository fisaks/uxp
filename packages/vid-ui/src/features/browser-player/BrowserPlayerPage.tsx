import Forward30Icon from "@mui/icons-material/Forward30";
import HomeIcon from "@mui/icons-material/Home";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RepeatIcon from "@mui/icons-material/Repeat";
import Replay30Icon from "@mui/icons-material/Replay30";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import StopIcon from "@mui/icons-material/Stop";
import { Box, Stack, Typography } from "@mui/material";
import { BROWSER_PLAYBACK_RATES, CastPlayerState, CastQueue, CastQueueRequest, editQueue, nextIndex, QueueEditError } from "@vid/common";
import React, { useEffect, useRef, useState } from "react";
import { createStreamLink, streamUrl, thumbnailUrl } from "../../api/home-video-api";
import { QueueList } from "../cast/QueueList";
import { clipName } from "../home-video/clipFormat";
import { useGetClipsQuery } from "../home-video/home-video.api";
import { SavePlaylistButton } from "../playlist/SavePlaylistButton";
import { LabelledIconButton } from "../shared/LabelledIconButton";
import { RateButton } from "../cast/RateButton";
import { ToggleIconButton } from "../shared/ToggleIconButton";
import { BrowserPlayerCommand, FromPlayerMessage, openChannel, showMainWindow, ToPlayerMessage } from "./browserPlayerLink";

const SKIP_SECONDS = 30;
/** The state is sent on the progress of the video at this pace at most. */
const REPORT_EVERY_MS = 1000;
const PLAYER_MAX_WIDTH = 1280;
/** The queue and the place in the clip are kept for the tab (not for the browser), so a reload carries on where it was. */
const STORAGE_KEY = "vid-browser-player";
type Saved = { queue: CastQueue; positionSec: number; paused: boolean };

const readSaved = (): Saved | undefined => {
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as Saved | null;
        return saved && saved.queue.clipIds.length > 0 ? saved : undefined;
    } catch {
        return undefined;
    }
};

const writeSaved = (saved: Saved | undefined) => {
    try {
        if (saved) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // A tab that cannot keep its queue just does not survive a reload.
    }
};

const EMPTY_QUEUE: CastQueue = { clipIds: [], index: 0, repeat: false };

/**
 * The page of the player tab. It plays the clips of its queue one after the other, and the app in the other tab asks it to play
 * more and shows where it is. The queue lives here only: it is gone when the tab is closed.
 */
export const BrowserPlayerPage: React.FC = () => {
    const { data: clips } = useGetClipsQuery();
    const [queue, setQueue] = useState<CastQueue>(EMPTY_QUEUE);
    // Counts the clips that are started, so that the clip that is already playing can be started again.
    const [playToken, setPlayToken] = useState(0);
    const [url, setUrl] = useState<string>();
    // Set when the queue has no more to play.
    const [finished, setFinished] = useState<Extract<CastPlayerState, "ENDED" | "FAILED">>();
    const [playing, setPlaying] = useState(false);
    const video = useRef<HTMLVideoElement>(null);
    // The speed stays for the next clip of the queue: it is picked to get through the clips.
    const [rate, setRate] = useState(1);
    const channel = useRef<BroadcastChannel>();
    // What the handlers of the channel and the video need, kept by reference so that they always see the latest.
    const queueRef = useRef(queue);
    const finishedRef = useRef(finished);
    finishedRef.current = finished;
    const startAt = useRef(0);
    // The clip that starts is not played, as when the tab was paused before it was reloaded.
    const startPaused = useRef(false);
    const failedInARow = useRef(0);
    const lastReport = useRef(0);

    const clipId = queue.clipIds[queue.index];
    const clip = clips?.find((c) => c.id === clipId);
    const next = nextIndex(queue);

    const report = () => {
        const element = video.current;
        // Until the clip has loaded and moved to where it starts, that place is the position, not the start of the new video.
        // A clip that has not loaded yet is as paused as it was asked to be.
        const paused = element && element.readyState > 0 ? element.paused : startPaused.current;
        const position = startAt.current > 0 ? startAt.current : (element?.currentTime ?? 0);
        const state: CastPlayerState =
            finishedRef.current ??
            (!element || !url ? "LOADING" : element.paused ? "PAUSED" : element.readyState < 3 ? "BUFFERING" : "PLAYING");
        channel.current?.postMessage({
            type: "state",
            state: {
                ...queueRef.current,
                state,
                positionSec: position,
                durationSec: element?.duration || 0,
            },
        } satisfies FromPlayerMessage);
        lastReport.current = Date.now();
        const { clipIds } = queueRef.current;
        writeSaved(clipIds.length > 0 && !finishedRef.current ? { queue: queueRef.current, positionSec: position, paused } : undefined);
    };

    /** Makes it the queue, and starts the clip at its index when `start` says so. */
    const apply = (queueNow: CastQueue, start: boolean, positionSec = 0, paused = false) => {
        queueRef.current = queueNow;
        setQueue(queueNow);
        if (start) {
            startAt.current = positionSec;
            startPaused.current = paused;
            setFinished(undefined);
            setPlayToken((token) => token + 1);
        }
    };

    const replace = (clipIds: string[], positionSec?: number) => {
        failedInARow.current = 0;
        apply({ clipIds: [...clipIds], index: 0, repeat: queueRef.current.repeat }, true, positionSec);
    };

    const edit = (request: CastQueueRequest): boolean => {
        const edited = { ...queueRef.current, clipIds: [...queueRef.current.clipIds] };
        try {
            const { playChanged } = editQueue(edited, request);
            apply(edited, playChanged);
            return true;
        } catch (error) {
            if (error instanceof QueueEditError) return false;
            throw error;
        }
    };

    /** The clip is over, or could not be played: the next one plays. A full round of clips that fail ends it, so that repeat does not loop. */
    const advance = (failed: boolean) => {
        const current = queueRef.current;
        failedInARow.current = failed ? failedInARow.current + 1 : 0;
        const index = nextIndex(current);
        if (index === undefined || failedInARow.current >= current.clipIds.length) {
            setFinished(failed ? "FAILED" : "ENDED");
            return;
        }
        apply({ ...current, index }, true);
    };

    const handleCommand = (command: BrowserPlayerCommand) => {
        switch (command.action) {
            case "play":
                void video.current?.play().catch(() => undefined);
                return;
            case "pause":
                video.current?.pause();
                return;
            case "seek":
                if (video.current) video.current.currentTime = command.positionSec;
                return;
            case "next-clip":
                if (nextIndex(queueRef.current) !== undefined) advance(false);
                return;
            case "stop":
                writeSaved(undefined);
                window.close();
                return;
            case "replace":
                replace(command.clipIds, command.positionSec);
                return;
            case "next":
            case "append":
                // A queue that has nothing more to play starts over with the clips.
                if (finishedRef.current || queueRef.current.clipIds.length === 0) replace(command.clipIds);
                else edit(command);
                return;
            default:
                edit(command);
        }
    };

    const latest = useRef({ report, handleCommand, advance });
    latest.current = { report, handleCommand, advance };

    // Declared before the effects that report, which would otherwise find an empty queue and forget the saved one.
    useEffect(() => {
        const saved = readSaved();
        if (saved) apply(saved.queue, true, saved.positionSec, saved.paused);
    }, []);

    useEffect(() => {
        const link = openChannel();
        channel.current = link;
        link.onmessage = ({ data }: MessageEvent<ToPlayerMessage>) => {
            if (data.type === "ping") latest.current.report();
            else latest.current.handleCommand(data.command);
        };
        link.postMessage({ type: "ready" } satisfies FromPlayerMessage);
        const closing = () => link.postMessage({ type: "closed" } satisfies FromPlayerMessage);
        window.addEventListener("pagehide", closing);
        return () => {
            window.removeEventListener("pagehide", closing);
            closing();
            link.close();
            channel.current = undefined;
        };
    }, []);

    // The link to the stream is made for each clip that starts, since it runs out.
    useEffect(() => {
        setUrl(undefined);
        const id = queueRef.current.clipIds[queueRef.current.index];
        if (!id) return;
        let current = true;
        createStreamLink(id)
            .then((link) => current && setUrl(streamUrl(link)))
            .catch(() => current && latest.current.advance(true));
        return () => {
            current = false;
        };
    }, [playToken]);

    useEffect(report, [queue, url, finished]);

    const skip = (seconds: number) => {
        if (video.current) video.current.currentTime = Math.max(0, video.current.currentTime + seconds);
    };

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: PLAYER_MAX_WIDTH, mx: "auto" }}>
            <Box sx={{ bgcolor: "common.black", borderRadius: 1, overflow: "hidden", aspectRatio: "16 / 9" }}>
                {url && (
                    <video
                        key={playToken}
                        ref={video}
                        src={url}
                        poster={clipId ? thumbnailUrl(clipId) : undefined}
                        controls
                        autoPlay={!startPaused.current}
                        playsInline
                        style={{ display: "block", width: "100%", height: "100%" }}
                        onLoadedMetadata={(event) => {
                            event.currentTarget.playbackRate = rate;
                            if (startAt.current > 0) event.currentTarget.currentTime = startAt.current;
                            startAt.current = 0;
                        }}
                        onPlaying={() => {
                            failedInARow.current = 0;
                            report();
                        }}
                        onPlay={() => setPlaying(true)}
                        onPause={() => {
                            setPlaying(false);
                            report();
                        }}
                        onWaiting={report}
                        onTimeUpdate={() => Date.now() - lastReport.current >= REPORT_EVERY_MS && report()}
                        onEnded={() => advance(false)}
                        onError={() => advance(true)}
                    />
                )}
            </Box>
            <Box sx={{ mt: 1.5 }}>
                <Typography variant="h6" noWrap>
                    {clip ? clipName(clip) : clipId ? "" : "Nothing to play"}
                </Typography>
                {queue.clipIds.length > 1 && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                        {finished === "FAILED" ? "Could not play the clips · " : finished === "ENDED" ? "Finished · " : ""}
                        {queue.index + 1} / {queue.clipIds.length}
                    </Typography>
                )}
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mt: 0.5 }}>
                    <LabelledIconButton label={`Back ${SKIP_SECONDS} s`} onClick={() => skip(-SKIP_SECONDS)}>
                        <Replay30Icon />
                    </LabelledIconButton>
                    <LabelledIconButton
                        label={playing ? "Pause" : "Play"}
                        onClick={() => (playing ? video.current?.pause() : void video.current?.play().catch(() => undefined))}
                    >
                        {playing ? <PauseIcon /> : <PlayArrowIcon />}
                    </LabelledIconButton>
                    <LabelledIconButton label={`Forward ${SKIP_SECONDS} s`} onClick={() => skip(SKIP_SECONDS)}>
                        <Forward30Icon />
                    </LabelledIconButton>
                    {next !== undefined && (
                        <LabelledIconButton label="Next clip" onClick={() => advance(false)}>
                            <SkipNextIcon />
                        </LabelledIconButton>
                    )}
                    <RateButton
                        rates={BROWSER_PLAYBACK_RATES}
                        rate={rate}
                        onChange={(value) => {
                            setRate(value);
                            if (video.current) video.current.playbackRate = value;
                        }}
                    />
                    <ToggleIconButton
                        active={queue.repeat}
                        label={queue.repeat ? "Repeat the queue: on" : "Repeat the queue: off"}
                        onClick={() => edit({ action: "repeat", repeat: !queue.repeat })}
                    >
                        <RepeatIcon />
                    </ToggleIconButton>
                    <LabelledIconButton label="Show the video app" onClick={showMainWindow}>
                        <HomeIcon />
                    </LabelledIconButton>
                    <LabelledIconButton
                        label="Stop and close"
                        onClick={() => {
                            writeSaved(undefined);
                            window.close();
                        }}
                    >
                        <StopIcon />
                    </LabelledIconButton>
                </Stack>
            </Box>
            {queue.clipIds.length > 1 && (
                <Box sx={{ mt: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Queue
                        </Typography>
                        <SavePlaylistButton source={{ clipIds: queue.clipIds }} />
                    </Stack>
                    <QueueList
                        queue={queue}
                        onJump={(index) => edit({ action: "jump", index })}
                        onRemove={(index) => edit({ action: "remove", index })}
                        onMove={async (from, to) => edit({ action: "move", from, to })}
                    />
                </Box>
            )}
        </Box>
    );
};
