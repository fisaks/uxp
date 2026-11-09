/** A named list of clips that plays in this order. It is made by saving the queue of a player. */
export type Playlist = {
    id: string;
    name: string;
    clipIds: string[];
};

/** What a playlist is saved from: the queue of a Chromecast, or the clips of the queue of the player tab of a browser. */
export type PlaylistSource = { deviceId: string } | { clipIds: string[] };

/** Saves a queue as a playlist. A name that is taken is refused unless `replace` is set, which keeps the id. */
export type PlaylistSaveRequest = PlaylistSource & {
    name: string;
    /**
     * Says that the caller knows the name is taken and wants it overwritten. The UI sets it after it has shown the Replace
     * button, so a UI whose list is out of date (another browser saved the same name in the meantime) cannot overwrite a
     * playlist by accident: the server answers 409 instead.
     */
    replace?: boolean;
};

export type PlaylistRenameRequest = {
    name: string;
};

export type PlaylistParams = {
    id: string;
};
