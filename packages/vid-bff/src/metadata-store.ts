import { AppLogger, SerializedJsonWriter } from "@uxp/bff-common";
import { readFile } from "fs/promises";

type MetadataFile<T> = { metadata: Record<string, T> };

const SAVE_DELAY_MS = 500;

/**
 * The metadata a user has set on the files of a library, in a JSON file keyed by the path of the file. It only ever changes the
 * entries that are edited, so the entries of files that are not on the drive right now stay. A file that exists and cannot be read
 * is left alone: nothing is saved over it. `what` names the library in the log.
 */
export class MetadataStore<T> {
    private metadata: Record<string, T> = {};
    private readable = true;
    private timer?: NodeJS.Timeout;
    private readonly writer?: SerializedJsonWriter;

    constructor(
        private readonly what: string,
        private readonly file?: string
    ) {
        if (file) {
            this.writer = new SerializedJsonWriter(file, (error) => AppLogger.warn(undefined, { message: `Could not save the ${what} metadata`, error }));
        }
    }

    async load(): Promise<void> {
        if (!this.file) {
            return;
        }
        let text: string;
        try {
            text = await readFile(this.file, "utf8");
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                this.readable = false;
                AppLogger.warn(undefined, { message: `Could not read the ${this.what} metadata, edits are not saved`, error });
            }
            return;
        }
        try {
            this.metadata = (JSON.parse(text) as MetadataFile<T>).metadata ?? {};
        } catch (error) {
            this.readable = false;
            AppLogger.warn(undefined, { message: `The ${this.what} metadata is not valid JSON, edits are not saved`, error });
        }
    }

    getMetadata(file: string): T | undefined {
        return this.metadata[file];
    }

    allMetadata(): T[] {
        return Object.values(this.metadata);
    }

    /** False when the edit cannot be kept, because there is nowhere to save it or the file is damaged. */
    canSave(): boolean {
        return this.readable && this.writer !== undefined;
    }

    updateMetadata(file: string, change: Partial<T>): void {
        this.metadata[file] = { ...this.metadata[file], ...change };
        clearTimeout(this.timer);
        this.timer = setTimeout(() => void this.flush(), SAVE_DELAY_MS);
    }

    /** Saves at once what has not been saved yet. */
    async flush(): Promise<void> {
        if (!this.timer || !this.writer) {
            return;
        }
        clearTimeout(this.timer);
        this.timer = undefined;
        await this.writer.write({ metadata: this.metadata } satisfies MetadataFile<T>);
    }
}
