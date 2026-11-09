import { useEffect, useState } from "react";
import { useSearchClipsQuery } from "../home-video/home-video.api";

const SEARCH_DEBOUNCE_MS = 250;

/** The ids of the clips that match the words, best first. Undefined while there are no words or no answer yet; a failed search has no answer. */
export const useClipSearch = (query: string) => {
    const [settled, setSettled] = useState(query);
    useEffect(() => {
        const timer = setTimeout(() => setSettled(query), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [query]);
    // `data` is the answer of an earlier query until the new one comes, so the list does not flash.
    const { data } = useSearchClipsQuery(settled, { skip: !settled });
    return query ? data : undefined;
};
