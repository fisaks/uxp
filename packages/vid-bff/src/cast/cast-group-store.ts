import { CastGroup } from "@vid/common";
import { AppLogger, SerializedJsonWriter } from "@uxp/bff-common";
import { readFile } from "fs/promises";

type GroupFile = { groups: CastGroup[] };

const SAVE_DELAY_MS = 500;

/** The saved cast groups, in a JSON file next to the queues. A file that cannot be read is no loss: the groups start empty. */
export class CastGroupStore {
    private groups: CastGroup[] = [];
    private timer?: NodeJS.Timeout;
    private readonly writer: SerializedJsonWriter;

    constructor(private readonly file: string) {
        this.writer = new SerializedJsonWriter(file, (error) =>
            AppLogger.warn(undefined, { message: "Could not save the cast groups", error })
        );
    }

    async load(): Promise<void> {
        try {
            const groups = (JSON.parse(await readFile(this.file, "utf8")) as GroupFile).groups ?? [];
            // Groups saved before the player tab could join have no `browser`.
            this.groups = groups.map((g) => ({ ...g, browser: g.browser ?? false }));
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                AppLogger.warn(undefined, { message: "Could not read the cast groups, starting empty", error });
            }
        }
    }

    all(): CastGroup[] {
        return this.groups;
    }

    get(id: string): CastGroup | undefined {
        return this.groups.find((g) => g.id === id);
    }

    /** Replaces the group with the same id, or adds it. */
    put(group: CastGroup) {
        const index = this.groups.findIndex((g) => g.id === group.id);
        if (index >= 0) {
            this.groups[index] = group;
        } else {
            this.groups.push(group);
        }
        this.scheduleSave();
    }

    delete(id: string): boolean {
        const index = this.groups.findIndex((g) => g.id === id);
        if (index < 0) {
            return false;
        }
        this.groups.splice(index, 1);
        this.scheduleSave();
        return true;
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
        await this.writer.write({ groups: this.groups } satisfies GroupFile);
    }
}
