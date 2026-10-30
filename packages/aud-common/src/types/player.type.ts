import { Collection, LibraryTrack } from "./library.type";

/**
 * "starting" is from the moment the music is asked for until the sound is there: the amplifier may be starting up
 * and the file loading. The position does not move then, and the player moves on to "playing" at the first position
 * the player reports.
 */
export type PlayerStatus = "stopped" | "starting" | "playing" | "paused";

/** What happens at the end of a track: stop after the last one, start again from the first, or play the same track again. */
export type RepeatMode = "off" | "all" | "one";
export const REPEAT_MODES: RepeatMode[] = ["off", "all", "one"];

/**
 * A track in the queue: a song, or a part of an audiobook. The cover of its album is at /api/cover/<collection>/<albumId>
 * when `hasCover` is true. The queue is either all music or all of one audiobook.
 */
export type QueueTrack = LibraryTrack & { collection: Collection; albumTitle: string; hasCover: boolean };

export type PlayerState = {
    status: PlayerStatus;
    /** The tracks in the order they are played, which is what is shown: shuffle mixes it and turning shuffle off brings the earlier order back. */
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
