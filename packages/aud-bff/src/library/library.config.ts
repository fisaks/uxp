export type LibraryConfig = {
    /** The folder with the music: Artist/Album/tracks. Without it the library is empty. */
    musicRoot?: string;
    /** Where the cache of the scan is kept. Without it every start scans all files. */
    dataDir?: string;
};

export const libraryConfig: LibraryConfig = {
    musicRoot: process.env.AUD_MUSIC_ROOT || undefined,
    dataDir: process.env.AUD_DATA_DIR || undefined,
};
