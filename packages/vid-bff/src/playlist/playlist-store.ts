import { Playlist } from "@vid/common";
import { AppLogger, SerializedJsonWriter } from "@uxp/bff-common";
import { readFile } from "fs/promises";

type PlaylistFile = { playlists: Playlist[] };

const SAVE_DELAY_MS = 500;

/**
 * The playlists, in a JSON file that lives with the videos. A file that exists and cannot be read is left alone: nothing is saved
 * over it, and without a file path there is nowhere to save.
 */
export class PlaylistStore {
    private playlists: Playlist[] = [];
    private readable = true;
    private timer?: NodeJS.Timeout;
    private readonly writer?: SerializedJsonWriter;

    constructor(private readonly file?: string) {
        if (file) {
            this.writer = new SerializedJsonWriter(file, (error) =>
                AppLogger.warn(undefined, { message: "Could not save the playlists", error })
            );
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
                AppLogger.warn(undefined, { message: "Could not read the playlists, changes are not saved", error });
            }
            return;
        }
        try {
            this.playlists = (JSON.parse(text) as PlaylistFile).playlists ?? [];
        } catch (error) {
            this.readable = false;
            AppLogger.warn(undefined, { message: "The playlists are not valid JSON, changes are not saved", error });
        }
    }

    /** False when a change cannot be kept, because there is nowhere to save it or the file is damaged. */
    canSave(): boolean {
        return this.readable && this.writer !== undefined;
    }

    all(): Playlist[] {
        return this.playlists;
    }

    /** Replaces the playlist with the same id, or adds it. */
    put(playlist: Playlist) {
        const index = this.playlists.findIndex((p) => p.id === playlist.id);
        if (index >= 0) {
            this.playlists[index] = playlist;
        } else {
            this.playlists.push(playlist);
        }
        this.scheduleSave();
    }

    delete(id: string): boolean {
        const index = this.playlists.findIndex((p) => p.id === id);
        if (index < 0) {
            return false;
        }
        this.playlists.splice(index, 1);
        this.scheduleSave();
        return true;
    }

    private scheduleSave() {
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
        await this.writer.write({ playlists: this.playlists } satisfies PlaylistFile);
    }
}
