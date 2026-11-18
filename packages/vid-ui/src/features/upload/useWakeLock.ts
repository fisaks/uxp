import { useEffect } from "react";

/** Keeps the screen on while `active`: a locked screen suspends the page, and the upload with it. */
export const useWakeLock = (active: boolean) => {
    useEffect(() => {
        if (!active || !navigator.wakeLock) return;
        let lock: WakeLockSentinel | undefined;
        let released = false;
        const request = () => {
            navigator.wakeLock
                .request("screen")
                .then((sentinel) => {
                    if (released) void sentinel.release();
                    else lock = sentinel;
                })
                .catch(() => undefined); // not allowed now (low battery, hidden page): the upload resumes anyway
        };
        // The lock is let go when the page is hidden, so it is taken again when the page is back.
        const onVisible = () => document.visibilityState === "visible" && request();
        request();
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            released = true;
            document.removeEventListener("visibilitychange", onVisible);
            void lock?.release();
        };
    }, [active]);
};
