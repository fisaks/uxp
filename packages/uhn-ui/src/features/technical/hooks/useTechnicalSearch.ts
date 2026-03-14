import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

const DEBOUNCE_MS = 300;
const SEARCH_PARAM = "search";

export type SearchIndexEntry<T> = { item: T; text: string };

type UseTechnicalSearchOptions<T> = {
    /** Pre-computed search index — each entry pairs an item with its lowercase searchable text. */
    searchIndex: SearchIndexEntry<T>[];
    /** Optional location state to preserve when updating the search URL param. */
    locationState?: unknown;
};

type UseTechnicalSearchResult<T> = {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    filteredItems: T[];
    totalCount: number;
};

/**
 * Client-side free-text search for technical pages (Resources, Views, Scenes).
 *
 * Supports multi-word AND matching — e.g. "kitchen button" matches items
 * containing both words (case-insensitive). The search term is kept in local
 * state for instant feedback and debounced to the `?search=` URL query param.
 */
export function useTechnicalSearch<T>({
    searchIndex,
    locationState,
}: UseTechnicalSearchOptions<T>): UseTechnicalSearchResult<T> {
    // Reads ?search= from the browser URL so the filter is restored on page load
    const [searchParams, setSearchParams] = useSearchParams();
    const initialSearch = searchParams.get(SEARCH_PARAM) ?? "";
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    const updateUrl = useCallback(
        (value: string) => {
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                setSearchParams(
                    (prev) => {
                        const next = new URLSearchParams(prev);
                        if (value) {
                            next.set(SEARCH_PARAM, value);
                        } else {
                            next.delete(SEARCH_PARAM);
                        }
                        return next;
                    },
                    { replace: true, state: locationState }
                );
            }, DEBOUNCE_MS);
        },
        [setSearchParams, locationState]
    );

    const onSearchChange = useCallback(
        (value: string) => {
            setSearchTerm(value);
            updateUrl(value);
        },
        [updateUrl]
    );

    useEffect(() => {
        return () => clearTimeout(debounceRef.current);
    }, []);

    const filteredItems = useMemo(() => {
        if (!searchTerm.trim()) return searchIndex.map(({ item }) => item);
        const tokens = searchTerm.toLowerCase().trim().split(/\s+/);
        return searchIndex
            .filter(({ text }) => tokens.every((token) => text.includes(token)))
            .map(({ item }) => item);
    }, [searchTerm, searchIndex]);

    return {
        searchTerm,
        onSearchChange,
        filteredItems,
        totalCount: searchIndex.length,
    };
}
