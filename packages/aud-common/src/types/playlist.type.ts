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
    /** The length of the tracks that are in the library. */
    durationSec: number;
    updatedAt: string;
};

export type Playlist = {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    entries: PlaylistEntry[];
};

export const MAX_PLAYLIST_NAME_LENGTH = 100;
