import { PLAYED_AFTER_SEC, PlayerState, PlayerStatus, QueueTrack, RepeatMode } from "@aud/common";
import { AppErrorV2, AppLogger, WebSocketDetails } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { amplifierService } from "../amplifier/amplifier.service";
import { historyService } from "../history/history.service";
import { libraryConfig } from "../library/library.config";
import { libraryService } from "../library/library.service";
import { AudioServerWebSocketManager } from "../ws/AudioServerWebSocketManager";
import { FakePlayerEngine } from "./fake-engine";
import { MplayerPlayerEngine } from "./mplayer-engine";
import { MpvPlayerEngine } from "./mpv-engine";
import { PlayerEngine } from "./player-engine";
import { PlayerConfig, playerConfig } from "./player.config";
import { PersistedQueue, QueueStore } from "./queue-store";
import { shuffledOrder } from "./player-order";

const PLAYER_TOPIC = "player";
// Previous plays the current track again when it has been playing for longer than this.
const RESTART_AFTER_SEC = 3;
// How often the position is sent to the clients while playing. They move it on by themselves in between.
const POSITION_PUBLISH_MS = 2000;

/** What the player needs of the amplifier: to have it ready when the music starts. */
type AmplifierControl = { prepareForPlayback(): Promise<void> };

type TrackSource = {
    getTrack(id: string): QueueTrack | undefined;
    getTrackFile(id: string): string | undefined;
    hasTracks(): boolean;
};

/** Where what was played and the queues that were replaced are kept. */
type HistoryRecorder = {
    trackPlayed(track: QueueTrack): void;
    queueReplaced(queue: QueueTrack[], currentIndex: number): void;
};

// Position reports come twice a second: a longer gap (a stall, a pause) is not listening time.
const LISTEN_GAP_MAX_MS = 2000;

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
 * `unshuffled` while shuffle is on. The service does not make sound itself, an engine does.
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
    private shuffle = false;
    private repeat: RepeatMode = "off";
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
    private playCounted = false;

    constructor(
        private readonly engine: PlayerEngine,
        private readonly tracks: TrackSource,
        private readonly wsManager: AudioServerWebSocketManager,
        private readonly amplifier: AmplifierControl,
        private readonly storage: QueueStorage,
        private readonly history: HistoryRecorder
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
        const saved = await this.storage.load();
        if (!saved || saved.tracks.length === 0 || !this.tracks.hasTracks()) {
            return;
        }
        const resolved = saved.tracks.map(({ id }) => this.tracks.getTrack(id));
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
            queue: this.queue,
            currentIndex: this.currentIndex >= 0 ? this.currentIndex : undefined,
            positionSec: this.currentPosition(),
            shuffle: this.shuffle,
            repeat: this.repeat,
        };
    }

    /** Replaces the queue with the tracks and plays the one at `startIndex`. Tracks that are not in the library are left out. */
    async playTracks(trackIds: string[], startIndex = 0): Promise<PlayerState> {
        const startId = trackIds[startIndex] ?? trackIds[0];
        const tracks = this.resolve(trackIds);
        if (tracks.length === 0) {
            return this.stopAll();
        }
        this.rememberQueue();
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

    enqueue(trackIds: string[]): PlayerState {
        const added = this.resolve(trackIds);
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
        const added = this.resolve(trackIds);
        if (this.currentIndex === -1) {
            return this.enqueue(trackIds);
        }
        this.insertAfterCurrent(added);
        return this.publish();
    }

    /** A track is played now without losing the queue: it goes right after the current track and starts, and the queue goes on after it. */
    async playNow(trackId: string): Promise<PlayerState> {
        const [track] = this.resolve([trackId]);
        if (!track) {
            return this.getState();
        }
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
        if (this.status === "playing") {
            this.setPosition(this.currentPosition());
            this.engine.pause();
            this.status = "paused";
            this.lastListenAt = undefined;
        } else if (this.status === "starting") {
            // Whatever waits for the amplifier or the file does not go on.
            this.startToken++;
            if (!this.engineStarted) {
                // Nothing has been started yet, so there is nothing to pause: this cancels, and Play starts the track again.
                return this.stopPlaying();
            }
            this.engine.pause();
            this.status = "paused";
        }
        return this.publish();
    }

    async resume(): Promise<PlayerState> {
        if (this.status === "paused") {
            return this.startByUser("resume");
        }
        if (this.status === "stopped" && this.currentIndex >= 0) {
            return this.startByUser("start");
        }
        return this.getState();
    }

    async next(): Promise<PlayerState> {
        return this.queue.length === 0 ? this.getState() : this.advance(false);
    }

    async previous(): Promise<PlayerState> {
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
        if (this.status === "playing" || this.status === "paused") {
            const duration = this.queue[this.currentIndex]?.durationSec;
            const position = Math.max(0, duration ? Math.min(positionSec, duration) : positionSec);
            this.engine.seek(position);
            this.setPosition(position);
        }
        return this.publish();
    }

    setShuffle(on: boolean): PlayerState {
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
        this.repeat = mode;
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
        // The end of the queue: stop at its start, ready to be played again.
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
        const token = ++this.startToken;
        this.status = "starting";
        if (from === "start") {
            this.engine.stop();
            this.engineStarted = false;
            this.setPosition(0);
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
        if (from === "resume") {
            this.engine.resume();
        } else {
            await this.startCurrent();
        }
    }

    private async startCurrent(): Promise<PlayerState> {
        const track = this.queue[this.currentIndex];
        const file = track && this.tracks.getTrackFile(track.id);
        this.startToken++;
        this.status = "starting";
        this.setPosition(0);
        this.listenedSec = 0;
        this.lastListenAt = undefined;
        this.playCounted = false;
        if (!file) {
            return this.onFileFailed(`The file of ${track?.title ?? "the track"} is not in the library`);
        }
        AppLogger.info(undefined, { message: `Playing "${track.title}" by ${track.artist} from ${file}` });
        try {
            await this.engine.play(file, track.durationSec);
        } catch (error) {
            return this.onFileFailed(error instanceof Error ? error.message : String(error));
        }
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
            this.history.trackPlayed(track);
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
        return this.status === "playing" ? this.positionSec + (Date.now() - this.positionAt) / 1000 : this.positionSec;
    }

    private stopPlaying(): PlayerState {
        this.startToken++;
        this.engineStarted = false;
        this.engine.stop();
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
        if (this.queue.length > 0) {
            this.history.queueReplaced(this.queue, this.currentIndex);
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

    private resolve(trackIds: string[]): QueueTrack[] {
        return trackIds.flatMap((id) => {
            const track = this.tracks.getTrack(id);
            return track ? [track] : [];
        });
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
            tracks: this.queue.map((track) => ({ id: track.id, name: `${track.artist} - ${track.title}` })),
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

export const playerService = new PlayerService(
    createEngine(playerConfig),
    libraryService,
    AudioServerWebSocketManager.getInstance(),
    amplifierService,
    new QueueStore(libraryConfig.dataDir),
    historyService
);
