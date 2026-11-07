import { HomeVideoClipUpdate } from "@vid/common";
import { AppLogger, SerializedJsonWriter } from "@uxp/bff-common";
import { readFile } from "fs/promises";

/** The metadata the user has set on a clip. `date` is only here when the user set it: null is a date the user cleared. */
export type HomeVideoMetadata = { date?: string | null; title?: string; description?: string; people?: string[]; tags?: string[] };
type MetadataFile = { metadata: Record<string, HomeVideoMetadata> };

const SAVE_DELAY_MS = 500;

/**
 * The metadata of the clips, in a JSON file keyed by the path of the clip. It only ever changes the entries that are edited, so
 * the entries of clips that are not on the drive right now stay. A file that exists and cannot be read is left alone: nothing is
 * saved over it.
 */
export class HomeVideoMetadataStore {
    private metadata: Record<string, HomeVideoMetadata> = {};
    private readable = true;
    private timer?: NodeJS.Timeout;
    private readonly writer?: SerializedJsonWriter;

    constructor(private readonly file?: string) {
        if (file) {
            this.writer = new SerializedJsonWriter(file, (error) => AppLogger.warn(undefined, { message: "Could not save the home video metadata", error }));
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
                AppLogger.warn(undefined, { message: "Could not read the home video metadata, edits are not saved", error });
            }
            return;
        }
        try {
            this.metadata = (JSON.parse(text) as MetadataFile).metadata ?? {};
        } catch (error) {
            this.readable = false;
            AppLogger.warn(undefined, { message: "The home video metadata is not valid JSON, edits are not saved", error });
        }
    }

    getMetadata(file: string): HomeVideoMetadata | undefined {
        return this.metadata[file];
    }

    allMetadata(): HomeVideoMetadata[] {
        return Object.values(this.metadata);
    }

    /** False when the edit cannot be kept, because there is nowhere to save it or the file is damaged. */
    canSave(): boolean {
        return this.readable && this.writer !== undefined;
    }

    updateMetadata(file: string, change: HomeVideoClipUpdate): void {
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
        await this.writer.write({ metadata: this.metadata } satisfies MetadataFile);
    }
}
