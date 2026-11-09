import { useEffect, useState } from "react";

const TICK_MS = 1000;

/** The time now, moving on every second while `active`, for a position that runs on the screen between the pushes. */
export const useNow = (active: boolean) => {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        if (!active) return;
        const timer = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(timer);
    }, [active]);
    return now;
};
