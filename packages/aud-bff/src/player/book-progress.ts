import { BookProgress } from "@aud/common";
import { AppLogger } from "@uxp/bff-common";
import path from "path";
import { libraryConfig } from "../library/library.config";
import { readJsonFile, SerializedJsonWriter } from "../storage/json-file";

const FILE = "book-progress.json";

/** Where the listening to a book was left. The name ("Author - Book") is for whoever reads the file. */
type StoredProgress = BookProgress & { name: string; updatedAt: string };

const isStoredProgress = (value: unknown): value is StoredProgress => {
    const progress = value as StoredProgress | undefined;
    return typeof progress?.partId === "string" && typeof progress.positionSec === "number";
};

/**
 * Where the household is in every book that has been started, in `book-progress.json` in the data folder, by the id of the
 * book. It is kept in memory and written at every change, which the player makes every few seconds while a book plays. A book
 * that is listened to to its end is forgotten, so playing it again starts at its beginning. Without a data folder nothing is kept
 * after a restart.
 */
export class BookProgressStore {
    private books = new Map<string, StoredProgress>();
    private readonly writer?: SerializedJsonWriter;

    constructor(private readonly dataDir?: string) {
        this.writer =
            dataDir === undefined
                ? undefined
                : new SerializedJsonWriter(path.join(dataDir, FILE), (error) =>
                      AppLogger.warn(undefined, { message: "Could not save the progress of the audiobooks", error })
                  );
    }

    async load() {
        const saved = this.dataDir && (await readJsonFile<Record<string, unknown>>(path.join(this.dataDir, FILE)));
        this.books = new Map(Object.entries(saved || {}).filter((entry): entry is [string, StoredProgress] => isStoredProgress(entry[1])));
    }

    get(albumId: string): BookProgress | undefined {
        const stored = this.books.get(albumId);
        return stored && { partId: stored.partId, positionSec: stored.positionSec };
    }

    /** The books that were started and not finished, the one listened to last first. */
    byRecency(): { albumId: string; progress: BookProgress }[] {
        return [...this.books]
            .sort(([, a], [, b]) => b.updatedAt.localeCompare(a.updatedAt))
            .map(([albumId, { partId, positionSec }]) => ({ albumId, progress: { partId, positionSec } }));
    }

    save(albumId: string, name: string, progress: BookProgress) {
        this.books.set(albumId, { ...progress, name, updatedAt: new Date().toISOString() });
        this.write();
    }

    clear(albumId: string) {
        if (this.books.delete(albumId)) {
            this.write();
        }
    }

    private write() {
        void this.writer?.write(Object.fromEntries(this.books));
    }
}

export const bookProgressStore = new BookProgressStore(libraryConfig.dataDir);
