import { MAX_ARTIST_COVERS } from "./library.type";
import { QueueTrack } from "./player.type";

/** One place of a playlist. `track` is missing when the track is no longer in the library, and `name` is what it was called when it was added. */
export type PlaylistEntry = {
    id: string;
    /** "Artist - Title" */
    name: string;
    track?: QueueTrack;
};

export type PlaylistSummary = {
    id: string;
    name: string;
    trackCount: number;
    /** The length of the tracks that are in the library or known from Spotify. */
    durationSec: number;
    updatedAt: string;
    /** When it was last played from the playlist, missing if never. */
    lastPlayedAt?: string;
    /** Up to MAX_ARTIST_COVERS albums with a cover, in the order of the tracks, for the picture of the playlist. */
    coverAlbumIds: string[];
    /** The pictures of Spotify tracks for the same picture, counted together with `coverAlbumIds` against MAX_ARTIST_COVERS. */
    coverUrls: string[];
};

export type Playlist = {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    entries: PlaylistEntry[];
};

export const MAX_PLAYLIST_NAME_LENGTH = 100;
