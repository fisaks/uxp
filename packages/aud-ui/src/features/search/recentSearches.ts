const STORAGE_KEY = "aud.recentSearches";
const MAX_RECENT = 8;

/** The last searches of this browser, newest first. Nothing is lost if the storage cannot be used: the list is then empty. */
export const loadRecentSearches = (): string[] => {
    try {
        const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
        return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT) : [];
    } catch {
        return [];
    }
};

const save = (queries: string[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
    } catch {
        // The list is a convenience, so a storage that cannot be written to is ignored.
    }
};

/** Puts the search first in the list (it moves up if it was there) and returns the new list. */
export const rememberSearch = (query: string): string[] => {
    const trimmed = query.trim();
    if (!trimmed) return loadRecentSearches();
    const queries = [trimmed, ...loadRecentSearches().filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
    save(queries);
    return queries;
};

export const clearRecentSearches = () => save([]);
