import { useEffect, useState } from "react";

/** True once `active` has been true for `delayMs`, and false as soon as it is false, so a state that is over quickly is not shown at all. */
export const useAfterDelay = (active: boolean, delayMs: number): boolean => {
    const [elapsed, setElapsed] = useState(false);

    useEffect(() => {
        if (!active) {
            setElapsed(false);
            return;
        }
        const timer = setTimeout(() => setElapsed(true), delayMs);
        return () => clearTimeout(timer);
    }, [active, delayMs]);

    return active && elapsed;
};
