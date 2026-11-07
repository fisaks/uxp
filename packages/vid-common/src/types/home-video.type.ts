/** A home video clip in the home video folder. */
export interface HomeVideoClip {
    /** Names the clip in the API: 16 hex characters made from its file path. */
    id: string;
    /** The path of the file, relative to the home video folder. */
    file: string;
    durationSeconds: number;
    width: number;
    height: number;
    sizeBytes: number;
    /** A full ISO date (YYYY-MM-DD), or null when the clip has none. */
    date: string | null;
    title: string;
    description: string;
    people: string[];
    tags: string[];
}

/** The fields of a clip that can be edited. Only the fields that are present change. */
export interface HomeVideoClipUpdate {
    date?: string | null;
    title?: string;
    description?: string;
    people?: string[];
    tags?: string[];
}

export interface HomeVideoClipParams {
    id: string;
}

/** The people and tags that are used on the clips, most used first, for autocomplete. */
export interface HomeVideoLabels {
    people: string[];
    tags: string[];
}

/** Where a stream can be fetched without the login cookie, for a limited time. */
export interface HomeVideoStreamLink {
    /** Path on the BFF API, with the signature in the query. A Chromecast needs it made absolute with the address of this host. */
    path: string;
    expiresAt: string;
}

/** Where a clip is played. Switching target hands over the position. */
export type PlaybackTarget = { kind: "browser" } | { kind: "cast"; deviceId: string };

export interface HomeVideoStreamQuery {
    exp: number;
    sig: string;
}

export interface HomeVideoSearchQuery {
    q: string;
}

/** The ids of the clips that match the words, best match first. */
export interface HomeVideoSearchResult {
    ids: string[];
}

/** The document of a clip in the search index. */
export interface HomeVideoSearchDoc {
    id: string;
    title: string;
    description: string;
    people: string[];
    tags: string[];
    /** The ISO date, so a search for 2009-03 or 2009 finds the clips of that time. */
    date: string;
    year: string;
}

/** Name of the Meilisearch index of the home videos. */
export const HOME_VIDEO_SEARCH_INDEX = "vid_home_videos";
