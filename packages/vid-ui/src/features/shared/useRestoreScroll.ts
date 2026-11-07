import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/** Where the page was scrolled to in each history entry, so Back finds a list where it was left. */
const scrollOfEntry = new Map<string, number>();

/**
 * Scrolls the page back to where it was when this history entry was left. Going forward to a view opens it at the top, since
 * that is a new entry. Pass `ready` as true once the content is on the page, as it cannot be scrolled to before.
 */
export const useRestoreScroll = (ready: boolean) => {
    const { key } = useLocation();
    useLayoutEffect(() => {
        if (!ready) return;
        window.scrollTo(0, scrollOfEntry.get(key) ?? 0);
    }, [ready, key]);
    // Recording starts when the page is in place, so the short page shown while loading does not overwrite the position.
    useEffect(() => {
        if (!ready) return;
        const record = () => scrollOfEntry.set(key, window.scrollY);
        window.addEventListener("scroll", record, { passive: true });
        return () => window.removeEventListener("scroll", record);
    }, [ready, key]);
};
