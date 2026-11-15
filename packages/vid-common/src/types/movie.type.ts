/** Which folder of the media root an item is in. */
export type MovieCategory = "movies" | "kids" | "tv";

/** Where TMDB keeps an entry: a film or a series. A TV film or a miniseries can be a series there. */
export type MovieTmdbKind = "movie" | "tv";

/** A subtitle file next to a video. */
export type MovieSubtitle = {
    /** Names the subtitle in the API: its place in the list of the item. */
    index: number;
    /** What the player shows: the language when the file name has one, else "Subtitles" (numbered when there are several). */
    label: string;
    /** The language code in the file name, when there is one. */
    language: string | null;
};

/** A film or an episode. */
export type MovieItem = {
    /** Names the item in the API: `m` and 16 hex characters made from the category and the path of its file. */
    id: string;
    category: MovieCategory;
    kind: "movie" | "episode";
    title: string;
    year: number | null;
    /** Only for an episode. */
    series: string | null;
    season: number | null;
    episode: number | null;
    /** The path of the file, relative to the folder of its category. */
    file: string;
    durationSeconds: number;
    width: number;
    height: number;
    sizeBytes: number;
    subtitles: MovieSubtitle[];
    /** The TMDB entry of the film, or of the series for an episode. Null when there is no match. */
    tmdbId: number | null;
    /** Which TMDB list the entry is in, null when there is no match. */
    tmdbKind: MovieTmdbKind | null;
    /** From TMDB, in English. */
    overview: string | null;
    /** From TMDB, 0 to 10. */
    rating: number | null;
    /** Whether the poster can be fetched from the poster routes. */
    hasPoster: boolean;
};

/** The fields of an item that can be edited. Only the fields that are present change. */
export type MovieItemUpdate = {
    title?: string;
    year?: number | null;
};

/** A TMDB entry the user can pick for an item. */
export type MovieMatchCandidate = {
    tmdbId: number;
    kind: MovieTmdbKind;
    title: string;
    year: number | null;
    overview: string | null;
    /** The path of the poster on TMDB, for the image address `https://image.tmdb.org/t/p/<size><posterPath>`. Null when it has none. */
    posterPath: string | null;
};

export type MovieMatchQuery = {
    q: string;
};

/** The TMDB entry the user picks for an item. Null says there is no match, and it is not looked up again. */
export type MovieMatchUpdate = {
    tmdbId: number | null;
    /** Where the entry is. Left out, it is the kind the item has now (a series for an episode, else a film). */
    kind?: MovieTmdbKind;
};

export type MovieItemParams = {
    id: string;
};

export type MovieSubtitleParams = {
    id: string;
    index: number;
};

export type MovieItemsQuery = {
    category?: MovieCategory;
};

/** Where a stream can be fetched without the login cookie, for a limited time. */
export type MovieStreamLink = {
    path: string;
    expiresAt: string;
};

export type MovieSearchQuery = {
    q: string;
};

/** The ids of the items that match the words, best match first. An episode is found by its series name too. */
export type MovieSearchResult = {
    ids: string[];
};

/** The document of an item in the search index. */
export type MovieSearchDoc = {
    id: string;
    title: string;
    /** The series of an episode, else empty. */
    series: string;
    year: string;
    overview: string;
};

/** Name of the Meilisearch index of the movies. */
export const MOVIE_SEARCH_INDEX = "vid_movies";
