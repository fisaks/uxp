import { RepeatMode } from "@aud/common";
import { AppLogger } from "@uxp/bff-common";
import path from "path";
import { readJsonFile, writeJsonFile } from "../storage/json-file";

/** What is kept of the player between restarts: the queue in the order it plays, and how it is played. Not the position, a restart starts the track again. */
export type PersistedQueue = {
    /** The tracks in the order they were added. The id is what counts, the name ("Artist - Title") is for whoever reads the file. */
    tracks: { id: string; name: string }[];
    /** The place in `tracks` of the current track, -1 when the queue is empty. */
    currentIndex: number;
    shuffle: boolean;
    repeat: RepeatMode;
    /** Only while shuffle is on: the order the tracks had before, as places in `tracks`. */
    original?: number[];
};

const FILE = "queue.json";
// The queue changes in bursts (a track after another), so what is written is what it is a moment after the last change.
const SAVE_DELAY_MS = 1000;

const isPersistedQueue = (value: unknown): value is PersistedQueue => {
    const queue = value as PersistedQueue | undefined;
    return (
        Array.isArray(queue?.tracks) &&
        queue.tracks.every((track) => typeof track?.id === "string") &&
        typeof queue?.currentIndex === "number" &&
        (queue.original === undefined || (Array.isArray(queue.original) && queue.original.every((place) => typeof place === "number"))) &&
        typeof queue?.shuffle === "boolean" &&
        ["off", "all", "one"].includes(queue?.repeat ?? "")
    );
};

/** The queue in a JSON file in the data folder. Without a data folder nothing is kept. */
export class QueueStore {
    private timer?: NodeJS.Timeout;
    private lastKept = "";

    constructor(private readonly dataDir?: string) {}

    async load(): Promise<PersistedQueue | undefined> {
        if (!this.dataDir) {
            return undefined;
        }
        const saved = await readJsonFile<unknown>(path.join(this.dataDir, FILE));
        if (!isPersistedQueue(saved)) {
            return undefined;
        }
        this.lastKept = JSON.stringify(saved);
        return saved;
    }

    save(queue: PersistedQueue) {
        const json = JSON.stringify(queue);
        if (!this.dataDir || json === this.lastKept) {
            return;
        }
        this.lastKept = json;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            writeJsonFile(path.join(this.dataDir as string, FILE), queue).catch((error) =>
                AppLogger.warn(undefined, { message: "Could not save the queue", error })
            );
        }, SAVE_DELAY_MS);
        this.timer.unref();
    }
}
