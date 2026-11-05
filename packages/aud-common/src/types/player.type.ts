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

/**
 * The answer to the health check: whether Spotify is set up on the machine, whether its player answers, and when the build of it
 * stops working (a build is good for 90 days) and when it was last updated.
 */
export type SpotifyHealth = {
    enabled: boolean;
    reachable: boolean;
    /** ISO time. Unknown when the build cannot be read. */
    expiresAt?: string;
    /** ISO time of the last update run that ended well, even when there was no newer build. */
    lastUpdateAt?: string;
};

/** A track that Spotify plays after the current one. */
export type SpotifyQueueEntry = {
    title: string;
    artist: string;
    durationSec: number;
    /** A small picture of the album, from Spotify. */
    coverUrl?: string;
};

/** What Spotify plays, when it is what was played last. It is played by the Spotify player of the machine, not by the queue. */
export type SpotifyNowPlaying = {
    status: "playing" | "paused";
    title: string;
    artist: string;
    album: string;
    /** The picture of the album, from Spotify. */
    coverUrl?: string;
    /** Where the track is when the state is sent; while playing a client shows it moving on from the time it received the state. */
    positionSec: number;
    durationSec: number;
    /** The tracks that come next, as far as Spotify's player reports them. */
    upcoming: SpotifyQueueEntry[];
};

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
    /** How fast it plays, 1 is normal. It stays when the next track or book starts. */
    speed: number;
    /** Set while Spotify is what was played last: the buttons of the player then control Spotify, and the queue waits. */
    spotify?: SpotifyNowPlaying;
    /** Set while Spotify is paused in the background because the player was started: it can be continued from where it is. */
    spotifyIdle?: SpotifyNowPlaying;
};
export const MIN_SPEED = 0.5;
export const MAX_SPEED = 3;
