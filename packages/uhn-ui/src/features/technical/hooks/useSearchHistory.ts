import { useCallback, useEffect, useState } from "react";

const SEARCH_HISTORY_MAX = 10;

function loadHistory(key: string): string[] {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveHistory(key: string, history: string[]) {
    localStorage.setItem(key, JSON.stringify(history));
}

function addToHistory(term: string, history: string[]): string[] {
    const filtered = history.filter(h => h !== term);
    return [term, ...filtered].slice(0, SEARCH_HISTORY_MAX);
}

/**
 * Manages a search history list in localStorage.
 */
export function useSearchHistory(key: string, initialTerm?: string) {
    const [history, setHistory] = useState(() => loadHistory(key));

    const commit = useCallback((term: string) => {
        const trimmed = term.trim();
        if (!trimmed) return;
        setHistory(prev => {
            const next = addToHistory(trimmed, prev);
            saveHistory(key, next);
            return next;
        });
    }, [key]);

    // Commit initial search term (e.g. from ?search= URL param)
    useEffect(() => {
        if (initialTerm) commit(initialTerm);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const remove = useCallback((term: string) => {
        setHistory(prev => {
            const next = prev.filter(h => h !== term);
            saveHistory(key, next);
            return next;
        });
    }, [key]);

    return { history, commit, remove };
}
