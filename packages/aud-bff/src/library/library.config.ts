import { Collection } from "@aud/common";

export type LibraryConfig = {
    /** Which library this is: what it is called in the log, and the collection its tracks and covers belong to. */
    collection: Collection;
    /** The folder with the files: Artist/Album/tracks, or Author/Book/tracks. Without it the library is empty. */
    root?: string;
    /** Where the cache of the scan is kept. Without it every start scans all files. */
    dataDir?: string;
    /** The name of the cache file in the data folder. */
    cacheFile: string;
    /** Added to the paths the ids are made of, so two libraries never share an id. */
    idSalt: string;
    /**
     * How the tracks of an album are put in order. "tags" follows the disc and track numbers of the tags, which is right for
     * music. "files" follows the names of the folders and files, which is right when the tags do not number the parts of a book.
     */
    order: "tags" | "files";
};

const dataDir = process.env.AUD_DATA_DIR || undefined;

export const libraryConfig: LibraryConfig = {
    collection: "music",
    root: process.env.AUD_MUSIC_ROOT || undefined,
    dataDir,
    cacheFile: "library.json",
    idSalt: "",
    order: "tags",
};

export const audiobookConfig: LibraryConfig = {
    collection: "audiobooks",
    root: process.env.AUD_AUDIOBOOK_ROOT || undefined,
    dataDir,
    cacheFile: "audiobooks.json",
    idSalt: "audiobook:",
    order: "files",
};
