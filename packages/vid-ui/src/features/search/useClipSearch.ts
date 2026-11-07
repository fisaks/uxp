import { useEffect, useState } from "react";
import { searchClips } from "../../api/home-video-api";

const SEARCH_DEBOUNCE_MS = 250;

/** The ids of the clips that match the words, best first. Undefined while there are no words or no answer yet; a failed search has no answer. */
export const useClipSearch = (query: string) => {
    const [found, setFound] = useState<{ query: string; ids: string[] }>();
    useEffect(() => {
        if (!query) return;
        let current = true;
        const timer = setTimeout(
            () =>
                searchClips(query)
                    .then((ids) => current && setFound({ query, ids }))
                    .catch(() => undefined),
            SEARCH_DEBOUNCE_MS
        );
        return () => {
            current = false;
            clearTimeout(timer);
        };
    }, [query]);
    // The answer of an earlier query stays until the new one comes, so the list does not flash.
    return query ? found?.ids : undefined;
};
