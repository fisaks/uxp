import { QueueTrack } from "./player.type";

/** A track that was played. `track` is missing when the track is no longer in the library, and `name` is what it was called. */
export type HistoryPlay = {
    id: string;
    /** "Artist - Title" */
    name: string;
    /** When it had been played long enough to count, as a time (ISO). */
    playedAt: string;
    track?: QueueTrack;
};

export type PreviousQueueEntry = {
    id: string;
    name: string;
    track?: QueueTrack;
};

/** A queue that was replaced or cleared, kept so it can be played again. */
export type PreviousQueue = {
    id: string;
    replacedAt: string;
    /** The place in `entries` of the track that was current. */
    currentIndex: number;
    /** In the order they were played in. */
    entries: PreviousQueueEntry[];
};

export type HistoryResponse = {
    /** The latest plays, newest first. */
    plays: HistoryPlay[];
    /** All the plays that are kept, which can be more than `plays` holds. */
    playCount: number;
    /** Newest first. */
    queues: PreviousQueue[];
};

/** A track counts as played when it has been listened to for this long, or for half of it when it is shorter than twice this. */
export const PLAYED_AFTER_SEC = 30;
export const MAX_HISTORY_PLAYS = 1000;
export const MAX_PREVIOUS_QUEUES = 10;
/** How many of the plays are sent to the UI at a time. */
export const HISTORY_PLAYS_SENT = 300;
