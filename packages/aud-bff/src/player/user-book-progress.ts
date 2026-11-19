import { BookProgress } from "@aud/common";
import { AppLogger, tryReadJsonFile, SerializedJsonWriter } from "@uxp/bff-common";
import path from "path";
import { libraryConfig } from "../library/library.config";

const FILE = "book-progress-users.json";

type StoredProgress = BookProgress & { updatedAt: string };
type UserBooks = Record<string, StoredProgress>;

const isStoredProgress = (value: unknown): value is StoredProgress => {
    const progress = value as StoredProgress | undefined;
    return typeof progress?.partId === "string" && typeof progress.positionSec === "number";
};

/**
 * Where each user is in the books they listen to in the browser, in `book-progress-users.json` in the data folder, by user and
 * then by the id of the book. The house player has its own, household-wide place (`BookProgressStore`); the two never write to
 * each other. A book heard to its end is forgotten. Without a data folder nothing is kept after a restart.
 */
export class UserBookProgressStore {
    private users = new Map<string, Map<string, StoredProgress>>();
    private readonly writer?: SerializedJsonWriter;

    constructor(private readonly dataDir?: string) {
        this.writer =
            dataDir === undefined
                ? undefined
                : new SerializedJsonWriter(path.join(dataDir, FILE), (error) =>
                      AppLogger.warn(undefined, { message: "Could not save the progress of the users in the audiobooks", error })
                  );
    }

    async load() {
        const saved = this.dataDir && (await tryReadJsonFile<Record<string, Record<string, unknown>>>(path.join(this.dataDir, FILE)));
        this.users = new Map(
            Object.entries(saved || {}).map(([userId, books]) => [
                userId,
                new Map(Object.entries(books || {}).filter((entry): entry is [string, StoredProgress] => isStoredProgress(entry[1]))),
            ])
        );
    }

    get(userId: string, albumId: string): BookProgress | undefined {
        const stored = this.users.get(userId)?.get(albumId);
        return stored && { partId: stored.partId, positionSec: stored.positionSec };
    }

    save(userId: string, albumId: string, progress: BookProgress) {
        const books = this.users.get(userId) ?? new Map<string, StoredProgress>();
        books.set(albumId, { partId: progress.partId, positionSec: progress.positionSec, updatedAt: new Date().toISOString() });
        this.users.set(userId, books);
        this.write();
    }

    clear(userId: string, albumId: string) {
        if (this.users.get(userId)?.delete(albumId)) {
            this.write();
        }
    }

    private write() {
        const users: Record<string, UserBooks> = {};
        this.users.forEach((books, userId) => {
            if (books.size > 0) {
                users[userId] = Object.fromEntries(books);
            }
        });
        void this.writer?.write(users);
    }
}

export const userBookProgressStore = new UserBookProgressStore(libraryConfig.dataDir);
