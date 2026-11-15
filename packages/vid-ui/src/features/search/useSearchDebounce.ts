import { useEffect, useState } from "react";

const SEARCH_DEBOUNCE_MS = 250;

/** The words once they have stopped changing for a moment, so a search is not made for every key. */
export const useSettledQuery = (query: string) => {
    const [settled, setSettled] = useState(query);
    useEffect(() => {
        const timer = setTimeout(() => setSettled(query), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [query]);
    return settled;
};
