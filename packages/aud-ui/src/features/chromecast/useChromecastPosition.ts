import { useEffect, useState } from "react";
import { useAppSelector } from "../../hooks";
import { selectChromecastPlayback, selectChromecastReceivedAt } from "./chromecastSelectors";

const TICK_MS = 500;

/** Where the media is, in seconds. The server sends the position every few seconds while playing, so it moves on from there. */
export const useChromecastPosition = (): number => {
    const playback = useAppSelector(selectChromecastPlayback);
    const receivedAt = useAppSelector(selectChromecastReceivedAt);
    const [now, setNow] = useState(Date.now());
    const playing = playback?.state === "PLAYING";

    useEffect(() => {
        if (!playing) return;
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(timer);
    }, [playing, receivedAt]);

    if (!playback) return 0;
    return playing ? playback.positionSec + Math.max(0, now - receivedAt) / 1000 : playback.positionSec;
};
