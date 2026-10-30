import {
    HISTORY_PLAYS_SENT,
    HistoryPlay,
    HistoryResponse,
    MAX_HISTORY_PLAYS,
    MAX_PREVIOUS_QUEUES,
    PreviousQueue,
    QueueTrack,
} from "@aud/common";
import { AppLogger } from "@uxp/bff-common";
import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import path from "path";
import { libraryConfig } from "../library/library.config";
import { libraryService } from "../library/library.service";
import { readJsonFile, SerializedJsonWriter } from "../storage/json-file";

const FILE = "history.json";

type StoredTrack = { id: string; name: string };
type StoredPlay = StoredTrack & { playedAt: string };
type StoredQueue = { id: string; replacedAt: string; currentIndex: number; tracks: StoredTrack[] };

type TrackSource = { getTrack(id: string): QueueTrack | undefined };

export type HistoryEventMap = {
    /** A track has counted as played, a queue has been kept, or the history has been cleared. */
    changed: [];
};

const nameOf = (track: QueueTrack) => `${track.artist} - ${track.title}`;

const isStoredTrack = (value: unknown): value is StoredTrack => typeof (value as StoredTrack)?.id === "string";
const isStoredPlay = (value: unknown): value is StoredPlay => isStoredTrack(value) && typeof (value as StoredPlay).playedAt === "string";
const isStoredQueue = (value: unknown): value is StoredQueue => {
    const queue = value as StoredQueue | undefined;
    return (
        typeof queue?.id === "string" &&
        typeof queue.replacedAt === "string" &&
        typeof queue.currentIndex === "number" &&
        Array.isArray(queue.tracks) &&
        queue.tracks.every(isStoredTrack)
    );
};

/**
 * What was played and the queues that were replaced, in `history.json` in the data folder, newest first. A play is a track that
 * has been listened to for long enough, and a queue is kept when it is replaced or cleared. Without a data folder they
 * are only kept until the next restart.
 */
export class HistoryService extends EventEmitter<HistoryEventMap> {
    private plays: StoredPlay[] = [];
    private queues: StoredQueue[] = [];
    private readonly writer?: SerializedJsonWriter;

    constructor(
        private readonly library: TrackSource,
        private readonly dataDir?: string
    ) {
        super();
        if (dataDir) {
            this.writer = new SerializedJsonWriter(path.join(dataDir, FILE), (error) =>
                AppLogger.warn(undefined, { message: "Could not save the history", error })
            );
        }
    }

    async load(): Promise<void> {
        if (!this.dataDir) {
            return;
        }
        const file = await readJsonFile<{ plays?: unknown[]; queues?: unknown[] }>(path.join(this.dataDir, FILE));
        this.plays = (file?.plays ?? []).filter(isStoredPlay).slice(0, MAX_HISTORY_PLAYS);
        this.queues = (file?.queues ?? []).filter(isStoredQueue).slice(0, MAX_PREVIOUS_QUEUES);
    }

    trackPlayed(track: QueueTrack): void {
        this.plays.unshift({ id: track.id, name: nameOf(track), playedAt: new Date().toISOString() });
        this.plays.length = Math.min(this.plays.length, MAX_HISTORY_PLAYS);
        this.changed();
    }

    /** Keeps a queue that is being replaced or cleared. A queue of one track is not worth keeping, nor is the one that is already the latest. */
    queueReplaced(queue: QueueTrack[], currentIndex: number): void {
        const ids = queue.map((track) => track.id).join();
        if (queue.length < 2 || this.queues[0]?.tracks.map((track) => track.id).join() === ids) {
            return;
        }
        this.queues.unshift({
            id: randomUUID(),
            replacedAt: new Date().toISOString(),
            currentIndex,
            tracks: queue.map((track) => ({ id: track.id, name: nameOf(track) })),
        });
        this.queues.length = Math.min(this.queues.length, MAX_PREVIOUS_QUEUES);
        this.changed();
    }

    get(): HistoryResponse {
        const resolve = ({ id, name }: StoredTrack) => {
            const track = this.library.getTrack(id);
            return { id, name: track ? nameOf(track) : name, track };
        };
        return {
            plays: this.plays.slice(0, HISTORY_PLAYS_SENT).map<HistoryPlay>((play) => ({ ...resolve(play), playedAt: play.playedAt })),
            playCount: this.plays.length,
            queues: this.queues.map<PreviousQueue>((queue) => ({
                id: queue.id,
                replacedAt: queue.replacedAt,
                currentIndex: queue.currentIndex,
                entries: queue.tracks.map(resolve),
            })),
        };
    }

    async clear(): Promise<HistoryResponse> {
        this.plays = [];
        this.queues = [];
        await this.save();
        this.emit("changed");
        return this.get();
    }

    private changed() {
        void this.save();
        this.emit("changed");
    }

    private save(): Promise<void> {
        return this.writer?.write({ plays: this.plays, queues: this.queues }) ?? Promise.resolve();
    }
}

export const historyService = new HistoryService(libraryService, libraryConfig.dataDir);
