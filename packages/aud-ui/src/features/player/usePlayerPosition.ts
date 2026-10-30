import { useEffect, useState } from "react";
import { useAppSelector } from "../../hooks";
import { selectPlayerReceivedAt, selectPlayerState } from "./playerSelectors";

const TICK_MS = 500;

/** Where the current track is, in seconds. The server sends the position when something changes, so while playing it moves on from there. */
export const usePlayerPosition = (): number => {
    const state = useAppSelector(selectPlayerState);
    const receivedAt = useAppSelector(selectPlayerReceivedAt);
    const [now, setNow] = useState(Date.now());
    const playing = state?.status === "playing";

    useEffect(() => {
        if (!playing) return;
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(timer);
    }, [playing, receivedAt]);

    if (!state) return 0;
    return playing ? state.positionSec + Math.max(0, now - receivedAt) / 1000 : state.positionSec;
};
