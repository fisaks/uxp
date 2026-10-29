import { LibraryTrack } from "./library.type";

export type PlayerStatus = "stopped" | "playing" | "paused";

/** What happens at the end of a track: stop after the last one, start again from the first, or play the same track again. */
export type RepeatMode = "off" | "all" | "one";
export const REPEAT_MODES: RepeatMode[] = ["off", "all", "one"];

/** A track in the queue. The cover of its album is at /api/cover/<albumId> when `hasCover` is true. */
export type QueueTrack = LibraryTrack & { hasCover: boolean };

export type PlayerState = {
    status: PlayerStatus;
    /** The tracks in the order they were added. The play order differs when shuffle is on. */
    queue: QueueTrack[];
    /** The track in `queue` that is playing or paused, or that plays next when stopped. Missing when the queue is empty. */
    currentIndex?: number;
    /**
     * Where the current track is when the state is sent. While playing, it moves on by itself, so a client shows it
     * moving from the time it received the state and is not sent the position every second.
     */
    positionSec: number;
    shuffle: boolean;
    repeat: RepeatMode;
};
