import { PlayerState, PlayerStatus, QueueTrack, RepeatMode } from "@aud/common";
import { AppErrorV2, AppLogger, WebSocketDetails } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { amplifierService } from "../amplifier/amplifier.service";
import { libraryConfig } from "../library/library.config";
import { libraryService } from "../library/library.service";
import { AudioServerWebSocketManager } from "../ws/AudioServerWebSocketManager";
import { FakePlayerEngine } from "./fake-engine";
import { MplayerPlayerEngine } from "./mplayer-engine";
import { MpvPlayerEngine } from "./mpv-engine";
import { PlayerEngine } from "./player-engine";
import { PlayerConfig, playerConfig } from "./player.config";
import { PersistedQueue, QueueStore } from "./queue-store";
import { sequentialOrder, shuffledOrder } from "./player-order";

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

/** Where the queue is kept between restarts. */
type QueueStorage = { load(): Promise<PersistedQueue | undefined>; save(queue: PersistedQueue): void };

/**
 * The queue and what is playing, shared by every client. The queue keeps the tracks in the order they were added, and
 * `order` is the order they are played in: the same unless shuffle is on, when it is a random order that is made once
 * and then followed forwards and backwards. The service does not make sound itself, an engine does.
 */
export class PlayerService {
    private queue: QueueTrack[] = [];
    private order: number[] = [];
    /** Where in `order` the current track is, -1 while the queue is empty. */
    private orderPos = -1;
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

    constructor(
        private readonly engine: PlayerEngine,
        private readonly tracks: TrackSource,
        private readonly wsManager: AudioServerWebSocketManager,
        private readonly amplifier: AmplifierControl,
        private readonly storage: QueueStorage
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
        if (!saved || saved.trackIds.length === 0 || !this.tracks.hasTracks()) {
            return;
        }
        const resolved = saved.trackIds.map((id) => this.tracks.getTrack(id));
        const newIndex = new Map<number, number>();
        this.queue = resolved.flatMap((track, oldIndex) => {
            if (!track) {
                return [];
            }
            newIndex.set(oldIndex, newIndex.size);
            return [track];
        });
        this.order = saved.order.flatMap((oldIndex) => (newIndex.has(oldIndex) ? [newIndex.get(oldIndex) as number] : []));
        const savedCurrent = saved.order[saved.orderPos];
        const kept = this.order.indexOf(newIndex.get(savedCurrent) ?? -1);
        // A current track that is gone gives way to the one that came after it.
        this.orderPos = this.queue.length === 0 ? -1 : kept !== -1 ? kept : Math.min(Math.max(saved.orderPos, 0), this.order.length - 1);
        this.shuffle = saved.shuffle;
        this.repeat = saved.repeat;
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
            currentIndex: this.orderPos >= 0 ? this.order[this.orderPos] : undefined,
            positionSec: this.currentPosition(),
            shuffle: this.shuffle,
            repeat: this.repeat,
        };
    }

    /** Replaces the queue with the tracks and plays the one at `startIndex`. Tracks that are not in the library are left out. */
    async playTracks(trackIds: string[], startIndex = 0): Promise<PlayerState> {
        const startId = trackIds[startIndex] ?? trackIds[0];
        this.queue = this.resolve(trackIds);
        const start = Math.max(
            0,
            this.queue.findIndex((track) => track.id === startId)
        );
        this.order = this.shuffle ? shuffledOrder(this.queue.length, start) : sequentialOrder(this.queue.length);
        this.orderPos = this.queue.length === 0 ? -1 : this.shuffle ? 0 : start;
        if (this.queue.length === 0) {
            return this.stopAll();
        }
        return this.startByUser("start");
    }

    enqueue(trackIds: string[]): PlayerState {
        const added = this.resolve(trackIds);
        const firstNew = this.queue.length;
        this.queue = [...this.queue, ...added];
        const newOrder = sequentialOrder(added.length).map((index) => firstNew + index);
        this.order = [...this.order, ...(this.shuffle ? shuffledOrder(added.length).map((index) => firstNew + index) : newOrder)];
        if (this.orderPos === -1 && this.queue.length > 0) {
            this.orderPos = 0;
        }
        return this.publish();
    }

    async playIndex(index: number): Promise<PlayerState> {
        const orderPos = this.order.indexOf(this.requireIndex(index));
        this.orderPos = orderPos;
        return this.startByUser("start");
    }

    async remove(index: number): Promise<PlayerState> {
        this.requireIndex(index);
        const removedPos = this.order.indexOf(index);
        this.queue = this.queue.filter((_, i) => i !== index);
        this.order = this.order.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i));
        if (this.queue.length === 0) {
            return this.stopAll();
        }
        if (removedPos < this.orderPos) {
            this.orderPos--;
            return this.publish();
        }
        if (removedPos > this.orderPos) {
            return this.publish();
        }
        // The current track was removed: the track after it is now at its place.
        if (this.orderPos >= this.order.length) {
            this.orderPos = 0;
            return this.stopPlaying();
        }
        return this.status === "stopped" ? this.publish() : this.startCurrent();
    }

    async clear(): Promise<PlayerState> {
        return this.stopAll();
    }

    pause(): PlayerState {
        if (this.status === "playing") {
            this.setPosition(this.currentPosition());
            this.engine.pause();
            this.status = "paused";
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
        if (this.status === "stopped" && this.orderPos >= 0) {
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
        const startOfQueue = this.orderPos === 0;
        if (this.status !== "stopped" && this.currentPosition() > RESTART_AFTER_SEC) {
            return this.seek(0);
        }
        if (startOfQueue && this.repeat !== "all") {
            return this.status === "stopped" ? this.getState() : this.seek(0);
        }
        this.orderPos = startOfQueue ? this.order.length - 1 : this.orderPos - 1;
        return this.startCurrent();
    }

    seek(positionSec: number): PlayerState {
        if (this.status === "playing" || this.status === "paused") {
            const duration = this.queue[this.order[this.orderPos]]?.durationSec;
            const position = Math.max(0, duration ? Math.min(positionSec, duration) : positionSec);
            this.engine.seek(position);
            this.setPosition(position);
        }
        return this.publish();
    }

    setShuffle(on: boolean): PlayerState {
        if (on !== this.shuffle) {
            this.shuffle = on;
            const current = this.orderPos >= 0 ? this.order[this.orderPos] : undefined;
            this.order = on ? shuffledOrder(this.queue.length, current) : sequentialOrder(this.queue.length);
            this.orderPos = current === undefined ? -1 : on ? 0 : current;
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
        if (this.orderPos + 1 < this.order.length) {
            this.orderPos++;
            return this.startCurrent();
        }
        if (this.repeat === "all") {
            this.orderPos = 0;
            return this.startCurrent();
        }
        // The end of the queue: stop at its start, ready to be played again.
        this.orderPos = this.order.length > 0 ? 0 : -1;
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
        const track = this.queue[this.order[this.orderPos]];
        const file = track && this.tracks.getTrackFile(track.id);
        this.startToken++;
        this.status = "starting";
        this.setPosition(0);
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
            this.publish();
        } else if (this.status === "playing") {
            this.setPosition(positionSec);
            this.publishPosition();
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
        this.order = [];
        this.orderPos = -1;
        return this.stopPlaying();
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
        this.storage.save({
            trackIds: this.queue.map((track) => track.id),
            order: this.order,
            orderPos: this.orderPos,
            shuffle: this.shuffle,
            repeat: this.repeat,
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
    new QueueStore(libraryConfig.dataDir)
);
