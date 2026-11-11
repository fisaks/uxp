/** Which folder of the media root an item is in. */
export type MovieCategory = "movies" | "kids" | "tv";

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
};

/** The fields of an item that can be edited. Only the fields that are present change. */
export type MovieItemUpdate = {
    title?: string;
    year?: number | null;
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
