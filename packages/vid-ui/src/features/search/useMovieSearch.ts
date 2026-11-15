import { useMemo } from "react";
import { MovieItem } from "@vid/common";
import { useGetMovieItemsQuery, useSearchMoviesQuery } from "../movie/movie.api";
import { useSettledQuery } from "./useSearchDebounce";

/**
 * The films and the series that match the words, best first. An episode stands for its series: a series is in the list once, as its
 * best matching episode. Undefined while there are no words or no answer yet; a failed search has no answer.
 */
export const useMovieSearch = (query: string): MovieItem[] | undefined => {
    const settled = useSettledQuery(query);
    const { data: ids } = useSearchMoviesQuery(settled, { skip: !settled });
    const { data: items } = useGetMovieItemsQuery(undefined);
    return useMemo(() => {
        if (!query || !ids || !items) return undefined;
        const byId = new Map(items.map((item) => [item.id, item]));
        const seen = new Set<string>();
        return ids.flatMap((id) => {
            const item = byId.get(id);
            const key = item?.series ?? id;
            if (!item || seen.has(key)) return [];
            seen.add(key);
            return item;
        });
    }, [query, ids, items]);
};
