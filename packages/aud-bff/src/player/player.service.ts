import {
    BookProgress,
    Collection,
    PLAYED_AFTER_SEC,
    PlayerState,
    PlayerStatus,
    QueueTrack,
    RepeatMode,
    SpotifyNowPlaying,
    SpotifyQueueEntry,
} from "@aud/common";
import { AppErrorV2, AppLogger, WebSocketDetails } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { amplifierService } from "../amplifier/amplifier.service";
import { historyService } from "../history/history.service";
import { libraryConfig } from "../library/library.config";
import { audiobookService, libraryService } from "../library/library.service";
import { AudioServerWebSocketManager } from "../ws/AudioServerWebSocketManager";
import { FakePlayerEngine } from "./fake-engine";
import { MplayerPlayerEngine } from "./mplayer-engine";
import { MpvPlayerEngine } from "./mpv-engine";
import { bookProgressStore } from "./book-progress";
import { trackGainStore } from "./track-gain";
import { PlayerEngine } from "./player-engine";
import { PlayerConfig, playerConfig } from "./player.config";
import { PersistedQueue, QueueStore } from "./queue-store";
import { SpotifyPlayers } from "./spotify-players";
import { isSpotifyId, spotifyCatalog } from "./spotify-catalog";
import { shuffledOrder } from "./player-order";

const PLAYER_TOPIC = "player";
// Previous plays the current track again when it has been playing for longer than this.
const RESTART_AFTER_SEC = 3;
// A book that is taken up again starts a little before where it was left, to hear what it was about.
const REWIND_ON_RESUME_SEC = 15;
// How often the place in a book that plays is kept.
const PROGRESS_SAVE_EVERY_MS = 15000;
// How often the position is sent to the clients while playing. They move it on by themselves in between.
const POSITION_PUBLISH_MS = 2000;

/** What the player needs of the amplifier: to have it ready when the music starts. */
type AmplifierControl = { prepareForPlayback(): Promise<void> };

/** The Spotify player of the machine: what it plays, and its buttons while Spotify is what the player shows. */
type SpotifyControl = {
    pause(): void;
    nowPlaying(): SpotifyNowPlaying | undefined;
    control(command: "play" | "pause" | "skip_next" | "skip_prev"): void;
    seek(positionSec: number): void;
    /** A button for the track of the queue that Spotify plays. */
    controlOwned(command: "play" | "pause"): void;
    /** Seeks in the track of the queue that Spotify plays. */
    seekOwned(positionSec: number): void;
    /** Where the track of the queue that Spotify plays is. */
    ownedPositionSec(): number;
    /** Plays a track for the queue; false when Spotify cannot be reached. */
    playOwned(uri: string): boolean;
    /** Whether the track is the one of the queue that Spotify plays. */
    owns(uri: string): boolean;
    /** The track of the queue that Spotify plays is stopped. */
    releaseOwned(): void;
    /** The queue is back after a restart: the track Spotify plays is taken over when it is the current one, else paused. */
    settleHouse(currentUri: string | undefined): void;
    /** The tracks of the URIs that Spotify plays or has coming. */
    find(uris: string[]): SpotifyQueueEntry[];
};

/** A library the player takes its tracks from. The tracks of the two libraries are never looked up together: a request says which it means. */
type TrackSource = {
    getTrack(id: string): QueueTrack | undefined;
    getTrackFile(id: string): string | undefined;
    hasTracks(): boolean;
    /** The tracks of an album, in the order they are played. */
    getTracks(albumId: string): { id: string }[];
};

/** Where the listening to the books is kept. */
type ProgressStorage = {
    get(albumId: string): BookProgress | undefined;
    save(albumId: string, name: string, progress: BookProgress): void;
    clear(albumId: string): void;
};

/** Where the gain of the tracks is kept. */
type GainStorage = {
    get(trackId: string): number;
    set(trackId: string, name: string, gainDb: number): void;
};

/** Where what was played and the queues that were replaced are kept. */
type HistoryRecorder = {
    trackPlayed(track: QueueTrack): void;
    bookPlayed(track: QueueTrack): void;
    queueReplaced(queue: QueueTrack[], currentIndex: number): void;
};

// Position reports come twice a second: a longer gap (a stall, a pause) is not listening time.
const LISTEN_GAP_MAX_MS = 2000;
/** How often the listening to a track of Spotify is counted: the engine reports no position for it. */
const SPOTIFY_LISTEN_INTERVAL_MS = 1000;

/** How long a track has to be listened to for it to count as played: 30 seconds, or half of a short track. */
const playedAfterSec = (track: QueueTrack) => Math.min(PLAYED_AFTER_SEC, (track.durationSec ?? 2 * PLAYED_AFTER_SEC) / 2);

/** A queue as it was, to bring it back. */
type QueueSnapshot = { queue: QueueTrack[]; currentIndex: number; shuffle: boolean; unshuffled: QueueTrack[]; wasPlaying: boolean };

/** Where the queue is kept between restarts. */
type QueueStorage = { load(): Promise<PersistedQueue | undefined>; save(queue: PersistedQueue): void };

/**
 * The queue and what is playing, shared by every client. The queue is the order the tracks are played in, and what is
 * shown is what plays: Next is the track after the current one, and dragging a track changes when it plays. Turning
 * shuffle on mixes the queue (the current track stays first), and turning it off brings back the order it had, kept in
 * `unshuffled` while shuffle is on. The queue is music or one audiobook, never both: a book is played in order from where
 * the listening was left, and its queue is not changed, shuffled or repeated, only played, paused, sought and replaced.
 * The service does not make sound itself, an engine does.
 */
export class PlayerService {
    private queue: QueueTrack[] = [];
    /** The place in the queue of the current track, -1 while the queue is empty. */
    private currentIndex = -1;
    /** The queue as it was before shuffle was turned on (the same objects), and nothing while shuffle is off. */
    private unshuffled: QueueTrack[] = [];
    /** The queue that was taken away when the queue was replaced or cleared, for Undo. */
    private replaced?: QueueSnapshot;
    private status: PlayerStatus = "stopped";
    /** Spotify is what was played last: until the user starts the player, the buttons are Spotify's. */
    private spotifyIsSource = false;
    private shuffle = false;
    private repeat: RepeatMode = "off";
    /** The speed chosen for the books: music always plays at normal speed, and this is kept for the next book. */
    private bookSpeed = 1;
    private positionSec = 0;
    private positionAt = Date.now();
    private failures = 0;
    private positionPublishedAt = 0;
    /** Counts the starts: a start that waits for the amplifier goes on only if nothing else has happened in the meantime. */
    private startToken = 0;
    /** True once the engine has the file, so pausing means something. */
    private engineStarted = false;
    /** How long the current track has really been listened to, and whether it has counted as played. */
    private listenedSec = 0;
    private lastListenAt?: number;
    private spotifyListenTimer?: NodeJS.Timeout;
    private playCounted = false;
    private progressSavedAt = 0;

    constructor(
        private readonly engine: PlayerEngine,
        private readonly libraries: Record<Collection, TrackSource>,
        private readonly wsManager: AudioServerWebSocketManager,
        private readonly amplifier: AmplifierControl,
        private readonly storage: QueueStorage,
        private readonly history: HistoryRecorder,
        private readonly progress: ProgressStorage,
        private readonly gains: GainStorage,
        private readonly spotify: SpotifyControl
    ) {
        engine.setListener({
            onPosition: (positionSec) => this.onPosition(positionSec),
            onEnded: () => void this.advance(true),
            onError: (message) => void this.onFileFailed(message),
        });
    }

    /**
     * Brings back the queue of before the restart, ready to play from the start of the current track. Tracks that are no
     * longer in the library are left out. Nothing is done while the library is empty, as it is before the first scan
     * and then every track would look missing: the saved queue is kept for the next start.
     */
    async restore(): Promise<void> {
        try {
            await this.restoreQueue();
        } finally {
            this.spotify.settleHouse(this.currentSpotifyUri);
        }
    }

    private async restoreQueue(): Promise<void> {
        const saved = await this.storage.load();
        if (!saved || saved.tracks.length === 0 || !Object.values(this.libraries).some((library) => library.hasTracks())) {
            return;
        }
        // The tracks of Spotify are not in a library: they are asked for, so that they are known below.
        if (!(await spotifyCatalog.resolve(saved.tracks.map(({ id }) => id)))) {
            // Spotify could not be asked: the tracks are not gone, and a queue without them would be what is saved next. It stays as it is.
            AppLogger.warn(undefined, { message: "Did not restore the queue: Spotify could not be asked for its tracks" });
            return;
        }
        // A queue saved before the audiobooks has no collection: it is music.
        const resolved = saved.tracks.map(({ id, collection = "music" }) => this.trackOf(id, collection));
        const newIndex = new Map<number, number>();
        this.queue = resolved.flatMap((track, oldIndex) => {
            if (!track) {
                return [];
            }
            newIndex.set(oldIndex, newIndex.size);
            return [track];
        });
        // A current track that is gone gives way to the track that came after it.
        const nextKept = [...newIndex].find(([oldIndex]) => oldIndex >= saved.currentIndex)?.[1];
        this.currentIndex = this.queue.length === 0 ? -1 : (nextKept ?? this.queue.length - 1);
        this.shuffle = saved.shuffle;
        this.repeat = saved.repeat;
        this.unshuffled = !saved.shuffle
            ? []
            : (saved.original?.flatMap((oldIndex) => (newIndex.has(oldIndex) ? [this.queue[newIndex.get(oldIndex) as number]] : [])) ?? [
                  ...this.queue,
              ]);
        this.persist();
        AppLogger.info(undefined, { message: `Restored the queue: ${this.queue.length} tracks` });
    }

    subscribe(socket: WebSocketDetails["socket"]): PlayerState {
        this.wsManager.joinTopic(socket, PLAYER_TOPIC);
        return this.getState();
    }

    getState(): PlayerState {
        return {
            status: this.status,
            queue: this.queue.map((track) => this.withGain(track)),
            currentIndex: this.currentIndex >= 0 ? this.currentIndex : undefined,
            positionSec: this.currentPosition(),
            shuffle: this.shuffle,
            repeat: this.repeat,
            speed: this.playbackSpeed(),
            spotify: this.spotifyIsSource ? this.spotify.nowPlaying() : undefined,
            // What Spotify plays for the queue is the queue's, there is nothing to continue.
            spotifyIdle:
                this.spotifyIsSource || (this.status !== "stopped" && this.currentSpotifyUri) ? undefined : this.spotify.nowPlaying(),
        };
    }

    /** Replaces the queue with the tracks and plays the one at `startIndex`. Tracks that are not in the library are left out. */
    async playTracks(trackIds: string[], startIndex = 0, shuffle?: boolean): Promise<PlayerState> {
        const startId = trackIds[startIndex] ?? trackIds[0];
        const tracks = this.resolve(trackIds);
        if (tracks.length === 0) {
            return this.stopAll();
        }
        this.rememberQueue();
        if (shuffle !== undefined) {
            this.shuffle = shuffle;
        }
        const start = Math.max(
            0,
            tracks.findIndex((track) => track.id === startId)
        );
        if (this.shuffle) {
            this.unshuffled = tracks;
            this.queue = shuffledOrder(tracks.length, start).map((index) => tracks[index]);
            this.currentIndex = 0;
        } else {
            this.unshuffled = [];
            this.queue = tracks;
            this.currentIndex = start;
        }
        return this.startByUser("start");
    }

    /**
     * Replaces the queue with the parts of a book and plays it from where the listening was left: the part and a little before
     * the place in it. With `partId` it starts that part from its beginning instead.
     */
    async playBook(albumId: string, partId?: string): Promise<PlayerState> {
        const parts = this.resolve(
            this.libraries.audiobooks.getTracks(albumId).map((part) => part.id),
            "audiobooks"
        );
        if (parts.length === 0) {
            throw new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "Unknown book" });
        }
        const saved = this.progress.get(albumId);
        const startId = partId ?? saved?.partId;
        const start = Math.max(
            0,
            parts.findIndex((part) => part.id === startId)
        );
        this.rememberQueue();
        if (partId) {
            this.keepProgress(parts[start], 0);
        }
        this.shuffle = false;
        this.repeat = "off";
        this.unshuffled = [];
        this.queue = parts;
        this.currentIndex = start;
        return this.startByUser("start");
    }

    enqueue(trackIds: string[]): PlayerState {
        return this.addToQueue(this.resolve(trackIds), false);
    }

    /** The tracks that Spotify plays or has coming are put in the queue, to be played by Spotify when their turn comes. */
    enqueueSpotify(uris: string[], next = false): PlayerState {
        const found = this.spotify.find(uris);
        if (found.length === 0) {
            throw new AppErrorV2({
                statusCode: 404,
                code: ErrorCodes.NOT_FOUND,
                message: "Spotify does not play or have those tracks coming",
            });
        }
        spotifyCatalog.add(found);
        return this.addToQueue(this.resolve(found.map((entry) => entry.uri)), next);
    }

    /** At the end of the queue, or right after the current track when `next` is true. */
    private addToQueue(added: QueueTrack[], next: boolean): PlayerState {
        this.requireMusicQueue();
        if (next && this.currentIndex !== -1) {
            this.insertAfterCurrent(added);
            return this.publish();
        }
        if (this.shuffle) {
            // What is added is mixed among itself and comes last, and it is where it was added in the order of before the shuffle.
            this.unshuffled.push(...added);
            this.queue.push(...shuffledOrder(added.length).map((index) => added[index]));
        } else {
            this.queue.push(...added);
        }
        if (this.currentIndex === -1 && this.queue.length > 0) {
            this.currentIndex = 0;
        }
        return this.publish();
    }

    /** The tracks go right after the current track, and the current track keeps playing. */
    playNext(trackIds: string[]): PlayerState {
        return this.addToQueue(this.resolve(trackIds), true);
    }

    /** A track is played now without losing the queue: it goes right after the current track and starts, and the queue goes on after it. */
    async playNow(trackId: string): Promise<PlayerState> {
        const [track] = this.resolve([trackId]);
        if (!track) {
            return this.getState();
        }
        this.requireMusicQueue();
        if (this.currentIndex === -1) {
            this.queue = [track];
            this.unshuffled = this.shuffle ? [track] : [];
            this.currentIndex = 0;
        } else {
            this.insertAfterCurrent([track]);
            this.currentIndex++;
        }
        return this.startByUser("start");
    }

    /**
     * Brings back the queue that the last replacing or clearing of the queue took away, as it was, with the track that
     * was current. It plays again when it was playing, from the start of that track. There is only one to bring back.
     */
    async undoQueue(): Promise<PlayerState> {
        const snapshot = this.replaced;
        if (!snapshot) {
            throw new AppErrorV2({ statusCode: 409, code: ErrorCodes.INVALID_STATE, message: "There is no queue to bring back" });
        }
        this.replaced = undefined;
        this.queue = snapshot.queue;
        this.unshuffled = snapshot.unshuffled;
        this.shuffle = snapshot.shuffle;
        this.currentIndex = snapshot.currentIndex;
        return snapshot.wasPlaying ? this.startByUser("start") : this.stopPlaying();
    }

    async playIndex(index: number): Promise<PlayerState> {
        this.currentIndex = this.requireIndex(index);
        return this.startByUser("start");
    }

    async remove(index: number): Promise<PlayerState> {
        this.requireMusicQueue();
        this.requireIndex(index);
        const [removed] = this.queue.splice(index, 1);
        this.unshuffled = this.unshuffled.filter((track) => track !== removed);
        if (this.queue.length === 0) {
            return this.stopAll();
        }
        if (index < this.currentIndex) {
            this.currentIndex--;
            return this.publish();
        }
        if (index > this.currentIndex) {
            return this.publish();
        }
        // The current track was removed: the track after it is now at its place.
        if (this.currentIndex >= this.queue.length) {
            this.currentIndex = 0;
            return this.stopPlaying();
        }
        return this.status === "stopped" ? this.publish() : this.startCurrent();
    }

    /** What is playing keeps playing, and what comes after it is what the queue shows after it. */
    move(from: number, to: number): PlayerState {
        this.requireMusicQueue();
        this.requireIndex(from);
        this.requireIndex(to);
        if (from !== to) {
            const current = this.queue[this.currentIndex];
            this.queue.splice(to, 0, ...this.queue.splice(from, 1));
            this.currentIndex = this.queue.indexOf(current);
        }
        return this.publish();
    }

    async clear(): Promise<PlayerState> {
        this.rememberQueue();
        return this.stopAll();
    }

    pause(): PlayerState {
        if (this.spotifyActive) {
            this.spotify.control("pause");
            return this.getState();
        }
        return this.pausePlayer();
    }

    private pausePlayer(): PlayerState {
        if (this.status === "playing") {
            this.setPosition(this.currentPosition());
            this.pauseSound();
            this.status = "paused";
            this.lastListenAt = undefined;
            this.saveProgress();
        } else if (this.status === "starting") {
            // Whatever waits for the amplifier or the file does not go on.
            this.startToken++;
            if (!this.engineStarted) {
                // Nothing has been started yet, so there is nothing to pause: this cancels, and Play starts the track again.
                return this.stopPlaying();
            }
            this.pauseSound();
            this.status = "paused";
        }
        return this.publish();
    }

    /** The current track is paused, by the engine or, for a track of Spotify, by Spotify (unless the user has taken it over). */
    private pauseSound() {
        const uri = this.currentSpotifyUri;
        if (!uri) {
            this.engine.pause();
        } else if (this.spotify.owns(uri)) {
            this.spotify.controlOwned("pause");
        }
    }

    /** The URI of the current track when it is a track of Spotify. */
    private get currentSpotifyUri(): string | undefined {
        const track = this.queue[this.currentIndex];
        return track?.spotify ? track.id : undefined;
    }

    /** Spotify reports what it plays of the queue: it plays or pauses (a Spotify app can do that too), or the track ended. */
    onQueueTrackChanged(change: "playing" | "paused" | "ended") {
        if (!this.currentSpotifyUri) {
            return;
        }
        if (change === "ended") {
            void this.advance(true);
        } else if (change === "playing" && (this.status === "starting" || this.status === "paused" || this.status === "stopped")) {
            this.status = "playing";
            this.setPosition(this.spotify.ownedPositionSec());
            this.startCountingSpotify();
            this.publish();
        } else if (change === "paused" && this.status === "playing") {
            this.setPosition(this.currentPosition());
            this.status = "paused";
            this.lastListenAt = undefined;
            this.publish();
        }
    }

    /** Counts the listening to the current track of Spotify until it no longer plays. */
    private startCountingSpotify() {
        this.lastListenAt = Date.now();
        this.spotifyListenTimer ??= setInterval(() => {
            if (this.status === "playing" && this.currentSpotifyUri) {
                this.countListening();
            } else {
                clearInterval(this.spotifyListenTimer);
                this.spotifyListenTimer = undefined;
            }
        }, SPOTIFY_LISTEN_INTERVAL_MS);
    }

    /**
     * Spotify starts to play, and the two never play at the same time: the player pauses where it is, and it is Spotify that
     * the buttons control from now on, until the user starts the player. A player that is already paused or stopped is left as it is.
     */
    yieldToSpotify(): PlayerState {
        AppLogger.info(undefined, { message: "Spotify plays, the player pauses" });
        this.pausePlayer();
        this.spotifyIsSource = true;
        return this.publish();
    }

    /** Something is cast to the Chromecast, which wins: the player and both Spotify players pause where they are. */
    yieldToChromecast(): PlayerState {
        AppLogger.info(undefined, { message: "Something is cast, the player pauses" });
        this.spotify.pause();
        this.pausePlayer();
        return this.publish();
    }

    /** What Spotify plays changed: the clients show it, as what the player shows or as what can be continued. */
    onSpotifyChanged() {
        const state = this.getState();
        // What Spotify shows in the queue page is known, so it can be put in a playlist from there.
        for (const spotify of [state.spotify, state.spotifyIdle]) {
            if (spotify) {
                const { upcoming, uri, title, artist, album, durationSec, coverUrl } = spotify;
                spotifyCatalog.add([{ uri, title, artist, album, durationSec, coverUrl }, ...upcoming]);
            }
        }
        this.wsManager.broadcastToTopic(PLAYER_TOPIC, { action: "player_state", success: true, payload: state });
    }

    /** The user continues the queue, which Spotify may have been the source over: it is paused where it is. */
    async resumeQueue(): Promise<PlayerState> {
        if (this.queue.length === 0) {
            return this.getState();
        }
        this.spotifyIsSource = false;
        return this.resume();
    }

    /** The user continues Spotify: when it plays, it is told the same way as when it is started from a Spotify app, and the player pauses. */
    resumeSpotify(): PlayerState {
        this.spotify.control("play");
        return this.getState();
    }

    /** Spotify is what was played last, and it is known what it plays: the buttons of the player are its buttons. */
    private get spotifyActive(): boolean {
        return this.spotifyIsSource && this.spotify.nowPlaying() !== undefined;
    }

    async resume(): Promise<PlayerState> {
        if (this.spotifyActive) {
            this.spotify.control("play");
            return this.getState();
        }
        if (this.status === "paused") {
            return this.startByUser("resume");
        }
        if (this.status === "stopped" && this.currentIndex >= 0) {
            return this.startByUser("start");
        }
        return this.getState();
    }

    async next(): Promise<PlayerState> {
        if (this.spotifyActive) {
            this.spotify.control("skip_next");
            return this.getState();
        }
        return this.queue.length === 0 ? this.getState() : this.advance(false);
    }

    async previous(): Promise<PlayerState> {
        if (this.spotifyActive) {
            this.spotify.control("skip_prev");
            return this.getState();
        }
        if (this.queue.length === 0) {
            return this.getState();
        }
        const startOfQueue = this.currentIndex === 0;
        if (this.status !== "stopped" && this.currentPosition() > RESTART_AFTER_SEC) {
            return this.seek(0);
        }
        if (startOfQueue && this.repeat !== "all") {
            return this.status === "stopped" ? this.getState() : this.seek(0);
        }
        this.currentIndex = startOfQueue ? this.queue.length - 1 : this.currentIndex - 1;
        return this.startCurrent();
    }

    seek(positionSec: number): PlayerState {
        if (this.spotifyActive) {
            this.spotify.seek(positionSec);
            return this.getState();
        }
        if (this.status === "playing" || this.status === "paused") {
            const duration = this.queue[this.currentIndex]?.durationSec;
            const position = Math.max(0, duration ? Math.min(positionSec, duration) : positionSec);
            if (this.currentSpotifyUri) {
                this.spotify.seekOwned(position);
            } else {
                this.engine.seek(position);
            }
            this.setPosition(position);
            this.saveProgress();
        }
        return this.publish();
    }

    setShuffle(on: boolean): PlayerState {
        if (on) {
            this.requireMusicQueue();
        }
        if (on !== this.shuffle) {
            this.shuffle = on;
            if (on) {
                this.unshuffled = [...this.queue];
                const current = this.currentIndex >= 0 ? this.currentIndex : undefined;
                this.queue = shuffledOrder(this.queue.length, current).map((index) => this.unshuffled[index]);
                this.currentIndex = current === undefined ? -1 : 0;
            } else {
                const current = this.queue[this.currentIndex];
                this.queue = this.unshuffled;
                this.unshuffled = [];
                this.currentIndex = this.queue.indexOf(current);
            }
        }
        return this.publish();
    }

    setRepeat(mode: RepeatMode): PlayerState {
        if (mode !== "off") {
            this.requireMusicQueue();
        }
        this.repeat = mode;
        return this.publish();
    }

    setSpeed(rate: number): PlayerState {
        // The position is brought up to date first: it is extrapolated from the speed it had until now.
        this.setPosition(this.currentPosition());
        this.bookSpeed = rate;
        this.engine.setSpeed(this.playbackSpeed());
        return this.publish();
    }

    /** Sets how much louder the current track is played, and keeps it for that track. Only the music of the library has a gain. */
    setGain(gainDb: number): PlayerState {
        const track = this.queue[this.currentIndex];
        if (!track || !this.hasGain(track)) {
            throw new AppErrorV2({
                statusCode: 409,
                code: ErrorCodes.INVALID_STATE,
                message: "The gain is set for a song of the library that is playing",
            });
        }
        this.gains.set(track.id, `${track.artist} - ${track.title}`, gainDb);
        this.engine.setGain(gainDb);
        return this.publish();
    }

    /** Sets the gain of songs of the library, such as an album, and keeps it for each. When one of them is playing it is heard at once. */
    setTracksGain(trackIds: string[], gainDb: number): PlayerState {
        const tracks = this.resolve(trackIds);
        for (const track of tracks) {
            this.gains.set(track.id, `${track.artist} - ${track.title}`, gainDb);
        }
        const current = this.queue[this.currentIndex];
        if (current && this.hasGain(current) && tracks.some((track) => track.id === current.id)) {
            this.engine.setGain(gainDb);
        }
        return this.publish();
    }

    /** The track after the current one. `ended` is true when it played to its end, which "repeat one" turns into the same track again. */
    private async advance(ended: boolean): Promise<PlayerState> {
        if (ended && (this.status === "stopped" || this.status === "paused")) {
            return this.getState();
        }
        if (ended && this.repeat === "one") {
            return this.startCurrent();
        }
        if (this.currentIndex + 1 < this.queue.length) {
            this.currentIndex++;
            return this.startCurrent();
        }
        if (this.repeat === "all") {
            this.currentIndex = 0;
            return this.startCurrent();
        }
        // The end of the queue: stop at its start, ready to be played again. A book that was heard to its end starts over.
        if (ended && this.isBookQueue()) {
            this.progress.clear(this.queue[0].albumId);
        }
        this.currentIndex = this.queue.length > 0 ? 0 : -1;
        return this.stopPlaying();
    }

    /**
     * Starts the current track, or continues a paused one, because the user asked for it. The amplifier is made ready
     * first and the music does not start until it is, so none of it is lost while the amplifier starts up. The state
     * is "starting" until the sound is there, and the answer is the state at once: the rest happens in the
     * background and reaches the clients as updates. The next track of a queue that plays does not do this, so an
     * input that is chosen on the amplifier while music plays is not changed back.
     */
    private startByUser(from: "start" | "resume"): PlayerState {
        if (!this.currentSpotifyUri) {
            this.spotify.pause();
        }
        this.spotifyIsSource = false;
        const token = ++this.startToken;
        this.status = "starting";
        if (from === "start") {
            this.engine.stop();
            this.engineStarted = false;
            this.setPosition(this.startOf(this.queue[this.currentIndex]));
        }
        const state = this.publish();
        void this.continueStart(token, from);
        return state;
    }

    private async continueStart(token: number, from: "start" | "resume") {
        await this.amplifier.prepareForPlayback();
        if (token !== this.startToken) {
            return;
        }
        const uri = this.currentSpotifyUri;
        if (from === "resume" && uri && this.spotify.owns(uri)) {
            this.spotify.controlOwned("play");
        } else if (from === "resume" && !uri) {
            this.engine.resume();
        } else {
            await this.startCurrent();
        }
    }

    private async startCurrent(): Promise<PlayerState> {
        const track = this.queue[this.currentIndex];
        const file = track && this.libraries[track.collection].getTrackFile(track.id);
        this.startToken++;
        this.status = "starting";
        const startSec = this.startOf(track);
        this.setPosition(startSec);
        this.keepProgress(track, startSec);
        this.listenedSec = 0;
        this.lastListenAt = undefined;
        this.playCounted = false;
        if (track?.spotify) {
            return this.startSpotifyTrack(track);
        }
        this.spotify.releaseOwned();
        if (!file) {
            return this.onFileFailed(`The file of ${track?.title ?? "the track"} is not in the library`);
        }
        AppLogger.info(undefined, { message: `Playing "${track.title}" by ${track.artist} from ${file}` });
        this.engine.setSpeed(this.playbackSpeed());
        this.engine.setGain(this.hasGain(track) ? this.gains.get(track.id) : 0);
        try {
            await this.engine.play(file, { durationSec: track.durationSec, startSec, accurateSeek: track.collection === "music" });
        } catch (error) {
            return this.onFileFailed(error instanceof Error ? error.message : String(error));
        }
        this.engineStarted = true;
        return this.publish();
    }

    private async startSpotifyTrack(track: QueueTrack): Promise<PlayerState> {
        AppLogger.info(undefined, { message: `Playing "${track.title}" by ${track.artist} from Spotify` });
        this.engine.stop();
        if (!this.spotify.playOwned(track.id)) {
            return this.onFileFailed(`Spotify cannot be reached, "${track.title}" is skipped`);
        }
        // Pausing is Spotify's now, and the sound is there when it reports it (`onQueueTrackChanged`).
        this.engineStarted = true;
        return this.publish();
    }

    /** A file that cannot be played is skipped, until every track of the queue has failed one after the other. */
    private async onFileFailed(message: string): Promise<PlayerState> {
        AppLogger.warn(undefined, { message: `Could not play: ${message}` });
        this.failures++;
        if (this.failures >= this.queue.length) {
            this.failures = 0;
            return this.stopPlaying();
        }
        return this.advance(false);
    }

    private onPosition(positionSec: number) {
        if (positionSec > 0) {
            this.failures = 0;
        }
        if (this.status === "starting" && this.engineStarted) {
            // The first position: the sound is there.
            this.status = "playing";
            this.setPosition(positionSec);
            this.lastListenAt = Date.now();
            this.publish();
        } else if (this.status === "playing") {
            this.setPosition(positionSec);
            this.countListening();
            this.publishPosition();
            this.saveProgressRegularly();
        }
    }

    /** Adds the time since the last position to what the track has been listened to, and records the play when it is enough. */
    private countListening() {
        const now = Date.now();
        if (this.lastListenAt !== undefined) {
            this.listenedSec += Math.min(now - this.lastListenAt, LISTEN_GAP_MAX_MS) / 1000;
        }
        this.lastListenAt = now;
        const track = this.queue[this.currentIndex];
        if (track && !this.playCounted && this.listenedSec >= playedAfterSec(track)) {
            this.playCounted = true;
            if (track.collection === "music") {
                this.history.trackPlayed(track);
            } else {
                this.history.bookPlayed(track);
            }
        }
    }

    /**
     * The engine knows where the sound really is. The clients only get a full state when something changes, so without
     * this their position would drift from the sound: a file that is slow to start, or a seek that lands a little off.
     */
    private publishPosition() {
        const now = Date.now();
        if (now - this.positionPublishedAt >= POSITION_PUBLISH_MS) {
            this.positionPublishedAt = now;
            this.wsManager.broadcastToTopic(PLAYER_TOPIC, {
                action: "player_position",
                success: true,
                payload: { positionSec: this.positionSec },
            });
        }
    }

    private setPosition(positionSec: number) {
        this.positionSec = positionSec;
        this.positionAt = Date.now();
    }

    private currentPosition(): number {
        return this.status === "playing"
            ? this.positionSec + ((Date.now() - this.positionAt) / 1000) * this.playbackSpeed()
            : this.positionSec;
    }

    private stopPlaying(): PlayerState {
        this.startToken++;
        this.engineStarted = false;
        this.engine.stop();
        this.spotify.releaseOwned();
        this.status = "stopped";
        this.setPosition(0);
        return this.publish();
    }

    private stopAll(): PlayerState {
        this.queue = [];
        this.unshuffled = [];
        this.currentIndex = -1;
        return this.stopPlaying();
    }

    /** Keeps the queue as it is, if it has tracks, before it is replaced or cleared. */
    private rememberQueue() {
        this.saveProgress();
        if (this.queue.length > 0) {
            if (!this.isBookQueue()) {
                this.history.queueReplaced(this.queue, this.currentIndex);
            }
            this.replaced = {
                queue: this.queue,
                currentIndex: this.currentIndex,
                shuffle: this.shuffle,
                unshuffled: this.unshuffled,
                wasPlaying: this.status === "playing" || this.status === "starting",
            };
        }
    }

    /** Puts tracks in the queue after the current track, and in the order of before the shuffle after it as well. */
    private insertAfterCurrent(tracks: QueueTrack[]) {
        if (this.shuffle) {
            const place = this.unshuffled.indexOf(this.queue[this.currentIndex]);
            this.unshuffled.splice(place + 1, 0, ...tracks);
        }
        this.queue.splice(this.currentIndex + 1, 0, ...tracks);
    }

    private playbackSpeed(): number {
        return this.isBookQueue() ? this.bookSpeed : 1;
    }

    private isBookQueue(): boolean {
        return this.queue[0]?.collection === "audiobooks";
    }

    /** The queue of a book is only played: what it is made of and the order of it stay. */
    private requireMusicQueue() {
        if (this.isBookQueue()) {
            throw new AppErrorV2({
                statusCode: 409,
                code: ErrorCodes.INVALID_STATE,
                message: "The queue is an audiobook, it cannot be changed",
            });
        }
    }

    /** Where a track starts: at its beginning, and a part of a book where the listening was left, a little before. */
    private startOf(track?: QueueTrack): number {
        const saved = track?.collection === "audiobooks" ? this.progress.get(track.albumId) : undefined;
        return saved && saved.partId === track?.id ? Math.max(0, saved.positionSec - REWIND_ON_RESUME_SEC) : 0;
    }

    /** Keeps the place in a part of a book. Nothing is kept for music. */
    private keepProgress(track: QueueTrack, positionSec: number) {
        if (track.collection !== "audiobooks") {
            return;
        }
        this.progress.save(track.albumId, `${track.artist} - ${track.albumTitle}`, {
            partId: track.id,
            positionSec: Math.floor(positionSec),
        });
        this.progressSavedAt = Date.now();
    }

    /** Keeps the place in the book that is the queue. Nothing is kept while it is not playing or paused, as the position then is not where the listening is. */
    private saveProgress() {
        const track = this.queue[this.currentIndex];
        if (this.isBookQueue() && track && this.status !== "stopped") {
            this.keepProgress(track, this.currentPosition());
        }
    }

    private saveProgressRegularly() {
        if (Date.now() - this.progressSavedAt >= PROGRESS_SAVE_EVERY_MS) {
            this.saveProgress();
        }
    }

    /** Whether the track can be played louder: a song of the library, not a part of a book and not Spotify, which has its own level. */
    private hasGain(track: QueueTrack): boolean {
        return track.collection === "music" && !track.spotify;
    }

    private withGain(track: QueueTrack): QueueTrack {
        const gainDb = this.hasGain(track) ? this.gains.get(track.id) : 0;
        return gainDb === 0 ? track : { ...track, gainDb };
    }

    /** The tracks of a library that are in it, in the order asked for: requests are about music unless they say audiobooks. */
    private resolve(trackIds: string[], collection: Collection = "music"): QueueTrack[] {
        return trackIds.flatMap((id) => {
            const track = this.trackOf(id, collection);
            return track ? [track] : [];
        });
    }

    /** A track by its id: of the library, or of Spotify, which music is also made of. */
    private trackOf(id: string, collection: Collection): QueueTrack | undefined {
        if (isSpotifyId(id)) {
            return collection === "music" ? spotifyCatalog.getTrack(id) : undefined;
        }
        return this.libraries[collection].getTrack(id);
    }

    private requireIndex(index: number): number {
        if (index >= this.queue.length) {
            throw new AppErrorV2({ statusCode: 400, code: ErrorCodes.VALIDATION, message: `There is no track ${index} in the queue` });
        }
        return index;
    }

    private persist() {
        const placeOf = new Map(this.queue.map((track, index) => [track, index]));
        this.storage.save({
            tracks: this.queue.map((track) => ({ id: track.id, name: `${track.artist} - ${track.title}`, collection: track.collection })),
            currentIndex: this.currentIndex,
            shuffle: this.shuffle,
            repeat: this.repeat,
            // While shuffle is on: the places the tracks had before, in that order, to bring it back when shuffle is turned off.
            ...(this.shuffle ? { original: this.unshuffled.map((track) => placeOf.get(track) as number) } : {}),
        });
    }

    private publish(): PlayerState {
        this.persist();
        const state = this.getState();
        this.wsManager.broadcastToTopic(PLAYER_TOPIC, { action: "player_state", success: true, payload: state });
        return state;
    }
}

const createEngine = ({ engine, mpv, mplayer }: PlayerConfig): PlayerEngine => {
    switch (engine) {
        case "mpv":
            return new MpvPlayerEngine(mpv);
        case "mplayer":
            return new MplayerPlayerEngine(mplayer);
        default:
            return new FakePlayerEngine();
    }
};

const soloist = new SpotifyPlayers({ public: playerConfig.soloistUrl, house: playerConfig.soloistHouseUrl }, playerConfig.soloistDir, {
    onPlaying: () => playerService.yieldToSpotify(),
    prepare: () => amplifierService.prepareForPlayback(),
    onChange: () => playerService.onSpotifyChanged(),
    onOwnedChange: (change) => playerService.onQueueTrackChanged(change),
});

export const playerService = new PlayerService(
    createEngine(playerConfig),
    { music: libraryService, audiobooks: audiobookService },
    AudioServerWebSocketManager.getInstance(),
    amplifierService,
    new QueueStore(libraryConfig.dataDir),
    historyService,
    bookProgressStore,
    trackGainStore,
    soloist
);
soloist.start();

export const spotifyHealth = async () => ({ ...(await soloist.health()), catalog: await spotifyCatalog.health() });
