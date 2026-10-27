import { LibraryTrack } from "@aud/common";

/** A track as the scanner found it. The file is relative to the music root, so the ids are the same on every machine. */
export type ScannedTrack = LibraryTrack & {
    file: string;
    size: number;
    modifiedMs: number;
    year?: number;
};

/** What the scanner found about an album folder, next to its tracks. */
export type ScannedAlbumFolder = {
    id: string;
    artistId: string;
    artistName: string;
    title: string;
    /** The picture to use as cover, relative to the music root. */
    cover?: string;
};

export type ScanResult = {
    tracks: ScannedTrack[];
    albumFolders: ScannedAlbumFolder[];
    /** Files whose tags could not be read. They are still in the library, named after the file. */
    unreadable: string[];
};
