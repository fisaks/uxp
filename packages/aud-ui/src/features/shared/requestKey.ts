/** The questions that are asked once and answered with a list or an item (the commands are sent by the player and playlist hooks). */
export type RequestAction =
    | "library_get_artists"
    | "library_get_albums"
    | "library_get_tracks"
    | "playlist_list"
    | "playlist_get"
    | "history_get";

/** The key of a question in the cache: the same question gives the same key. */
export const requestKey = (action: RequestAction, payload: unknown) => `${action}:${JSON.stringify(payload)}`;
