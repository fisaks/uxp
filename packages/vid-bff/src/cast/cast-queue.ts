import { CastQueue } from "@vid/common";
import { AppLogger, SerializedJsonWriter } from "@uxp/bff-common";
import { readFile } from "fs/promises";

type QueueFile = { queues: Record<string, CastQueue> };

const SAVE_DELAY_MS = 500;

/** The queue of each Chromecast, by device id, kept in a file so that it survives a restart of the server. */
export class CastQueueStore {
    private queues = new Map<string, CastQueue>();
    private timer?: NodeJS.Timeout;
    private readonly writer: SerializedJsonWriter;

    constructor(private readonly file: string) {
        this.writer = new SerializedJsonWriter(file, (error) =>
            AppLogger.warn(undefined, { message: "Could not save the cast queues", error })
        );
    }

    /** A file that is missing or damaged is no loss: the queues start empty. */
    async load(): Promise<void> {
        try {
            const { queues } = JSON.parse(await readFile(this.file, "utf8")) as QueueFile;
            this.queues = new Map(Object.entries(queues ?? {}));
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                AppLogger.warn(undefined, { message: "Could not read the cast queues, starting empty", error });
            }
        }
    }

    get(deviceId: string): CastQueue | undefined {
        return this.queues.get(deviceId);
    }

    /** Keeps the queue, and saves it soon. Also call it after a queue that is kept here has been edited. */
    set(deviceId: string, queue: CastQueue) {
        this.queues.set(deviceId, queue);
        this.scheduleSave();
    }

    delete(deviceId: string) {
        if (this.queues.delete(deviceId)) {
            this.scheduleSave();
        }
    }

    private scheduleSave() {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => void this.flush(), SAVE_DELAY_MS);
    }

    /** Saves at once what has not been saved yet. */
    async flush(): Promise<void> {
        if (!this.timer) {
            return;
        }
        clearTimeout(this.timer);
        this.timer = undefined;
        await this.writer.write({ queues: Object.fromEntries(this.queues) } satisfies QueueFile);
    }
}
