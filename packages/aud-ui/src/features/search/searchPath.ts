export const SEARCH_PATH = "/search";

/** The results page for the words; the filters are added to it by the page itself. */
export const searchPagePath = (query: string) => `${SEARCH_PATH}?q=${encodeURIComponent(query)}`;
