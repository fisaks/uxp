import { BookStreamLink } from "@aud/common";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { getBaseUrl } from "../../config";
import { errorText } from "../shared/errorText";
import { useRequest } from "../shared/useRequest";

/** The place is saved this often while the book plays. */
const SAVE_EVERY_MS = 15000;
/** A book is taken up this much before the place it was left at, to hear how the story went. */
const REWIND_SEC = 15;
const SKIP_SEC = 30;
/** The speeds the speed button goes through, the same as on the Now Playing page. */
export const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

const baseUrl = () => getBaseUrl().replace(/\/$/, "");

/**
 * Plays a book in this browser as one stream (the parts are chapters of it) and keeps the place of the user. The sound is
 * the browser's own and does not touch the player of the house.
 */
export const useBookListener = (albumId: string) => {
    const { data, error: dataError } = useRequest("audiobook_get_parts", { albumId });
    const { sendMessageAsync } = useAudioWebSocket();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [link, setLink] = useState<BookStreamLink>();
    const [src, setSrc] = useState<string>();
    const [linkError, setLinkError] = useState<string>();
    const [playing, setPlaying] = useState(false);
    const [positionSec, setPositionSec] = useState(0);
    const [speed, setSpeed] = useState(1);
    // Where to go when the stream has been loaded: the saved place the first time, the place where it broke after an error.
    const startAtRef = useRef<{ sec: number; play: boolean }>();
    const initialisedRef = useRef(false);
    const lastReloadRef = useRef(0);

    const partIndexAt = useCallback(
        (sec: number) => (link ? Math.max(0, link.parts.filter((part) => part.startSec <= sec).length - 1) : 0),
        [link]
    );
    const partIndex = partIndexAt(positionSec);

    const loadLink = useCallback(async () => {
        try {
            const { data: fresh } = await axios.post<BookStreamLink>(`${baseUrl()}/api/audiobooks/${albumId}/stream-link`, undefined, {
                withCredentials: true,
            });
            setLink(fresh);
            setSrc(`${baseUrl()}${fresh.streamPath}?${fresh.query}`);
            setLinkError(undefined);
        } catch (e) {
            setLinkError(errorText(e, "The book cannot be played in this browser."));
        }
    }, [albumId]);

    useEffect(() => {
        void loadLink();
    }, [loadLink]);

    // The first start place: where this user was, else where the house was, else the beginning.
    useEffect(() => {
        if (!link || !data || initialisedRef.current) return;
        initialisedRef.current = true;
        const saved = data.userProgress ?? data.progress;
        const part = saved && link.parts.find((candidate) => candidate.partId === saved.partId);
        if (saved && part)
            startAtRef.current = { sec: Math.max(part.startSec, part.startSec + saved.positionSec - REWIND_SEC), play: false };
    }, [link, data]);

    const saveProgress = useCallback(() => {
        const audio = audioRef.current;
        if (!link || !audio || !initialisedRef.current || audio.readyState === 0 || startAtRef.current) return;
        const part = link.parts[partIndexAt(audio.currentTime)];
        void sendMessageAsync("audiobook_save_user_progress", {
            albumId,
            partId: part.partId,
            positionSec: Math.floor(audio.currentTime - part.startSec),
        }).catch(() => undefined);
    }, [link, albumId, partIndexAt, sendMessageAsync]);

    const seekTo = useCallback((sec: number) => {
        const audio = audioRef.current;
        if (audio) audio.currentTime = Math.max(0, Math.min(sec, audio.duration || sec));
    }, []);
    const skip = useCallback((deltaSec: number) => seekTo((audioRef.current?.currentTime ?? 0) + deltaSec), [seekTo]);
    const play = useCallback(() => void audioRef.current?.play().catch(() => undefined), []);
    const pause = useCallback(() => audioRef.current?.pause(), []);
    const toggle = useCallback(() => (audioRef.current?.paused ? play() : pause()), [play, pause]);
    const goToPart = useCallback(
        (index: number) => {
            const part = link?.parts[index];
            if (part) seekTo(part.startSec);
        },
        [link, seekTo]
    );
    const changeSpeed = useCallback(() => {
        const next = SPEEDS.find((candidate) => candidate > speed) ?? SPEEDS[0];
        setSpeed(next);
        if (audioRef.current) audioRef.current.playbackRate = next;
    }, [speed]);

    // While the book plays the place is saved now and then, and when the tab goes away.
    useEffect(() => {
        if (!playing) return;
        const timer = setInterval(saveProgress, SAVE_EVERY_MS);
        return () => clearInterval(timer);
    }, [playing, saveProgress]);
    useEffect(() => {
        window.addEventListener("pagehide", saveProgress);
        return () => window.removeEventListener("pagehide", saveProgress);
    }, [saveProgress]);

    // The handlers of the audio element.
    const onLoadedMetadata = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.playbackRate = speed;
        audio.preservesPitch = true;
        const startAt = startAtRef.current;
        startAtRef.current = undefined;
        if (startAt) {
            audio.currentTime = startAt.sec;
            setPositionSec(startAt.sec);
            if (startAt.play) play();
        }
    };
    const onTimeUpdate = () => {
        const audio = audioRef.current;
        if (!audio) return;
        const before = partIndexAt(positionSec);
        setPositionSec(audio.currentTime);
        if (partIndexAt(audio.currentTime) !== before) saveProgress();
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => {
        setPlaying(false);
        saveProgress();
    };
    const onEnded = () => {
        setPlaying(false);
        void sendMessageAsync("audiobook_clear_user_progress", { albumId }).catch(() => undefined);
    };
    // A broken stream (a dropped connection, an old link) is loaded again once a minute, from where it stopped.
    const onError = () => {
        const audio = audioRef.current;
        if (!audio || Date.now() - lastReloadRef.current < 60000) {
            setLinkError("The sound stopped. Press play to try again.");
            return;
        }
        lastReloadRef.current = Date.now();
        startAtRef.current = { sec: audio.currentTime, play: !audio.paused };
        void loadLink();
    };
    const retry = () => {
        const audio = audioRef.current;
        lastReloadRef.current = Date.now();
        startAtRef.current = { sec: audio?.currentTime ?? 0, play: true };
        setLinkError(undefined);
        void loadLink();
    };

    return {
        data,
        link,
        src,
        error: dataError ?? linkError,
        audioRef,
        playing,
        positionSec,
        partIndex,
        speed,
        controls: { play, pause, toggle, skip, seekTo, goToPart, changeSpeed, retry, saveProgress },
        skipSec: SKIP_SEC,
        audioProps: { onLoadedMetadata, onTimeUpdate, onPlay, onPause, onEnded, onError, onSeeked: saveProgress },
    };
};
