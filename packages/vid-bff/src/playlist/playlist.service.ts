import { Playlist, PlaylistSource } from "@vid/common";
import { AppErrorV2 } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { randomBytes } from "crypto";
import { castService } from "../cast/cast.service";
import { homeVideoConfig } from "../home-video/home-video.config";
import { PlaylistStore } from "./playlist-store";

const sameName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;

/** The saved playlists. One is made from the queue of a Chromecast, and playing it is a `replace` of a queue with its clips. */
export class PlaylistService {
    private readonly store = new PlaylistStore(homeVideoConfig.playlistsFile);

    load(): Promise<void> {
        return this.store.load();
    }

    flush(): Promise<void> {
        return this.store.flush();
    }

    list(): Playlist[] {
        return [...this.store.all()];
    }

    /**
     * Saves the queue the device plays, or the clips the caller sends from a queue that lives in a browser. An existing name is only taken over when `replace` says so: the caller may not know the
     * name is taken, so the server does not trust that it does.
     */
    save(source: PlaylistSource, name: string, replace: boolean): Playlist[] {
        const trimmed = this.checkedName(name);
        const clipIds = this.clipsOf(source);
        const existing = this.store.all().find((p) => sameName(p.name, trimmed));
        if (existing && !replace) {
            throw this.nameTaken(trimmed);
        }
        this.store.put({ id: existing?.id ?? randomBytes(8).toString("hex"), name: trimmed, clipIds });
        return this.list();
    }

    rename(id: string, name: string): Playlist[] {
        const trimmed = this.checkedName(name);
        const playlist = this.find(id);
        if (this.store.all().some((p) => p.id !== id && sameName(p.name, trimmed))) {
            throw this.nameTaken(trimmed);
        }
        this.store.put({ ...playlist, name: trimmed });
        return this.list();
    }

    remove(id: string): Playlist[] {
        this.checkSaving();
        if (!this.store.delete(id)) {
            throw this.notFound();
        }
        return this.list();
    }

    private clipsOf(source: PlaylistSource): string[] {
        if ("clipIds" in source) {
            return [...source.clipIds];
        }
        const queue = castService.queueOf(source.deviceId);
        if (!queue) {
            throw new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "Nothing is queued on that Chromecast", params: { resource: "queue" } });
        }
        return [...queue.clipIds];
    }

    private find(id: string): Playlist {
        const playlist = this.store.all().find((p) => p.id === id);
        if (!playlist) {
            throw this.notFound();
        }
        return playlist;
    }

    private checkedName(name: string): string {
        this.checkSaving();
        const trimmed = name.trim();
        if (trimmed === "") {
            throw new AppErrorV2({ statusCode: 400, code: ErrorCodes.VALIDATION, message: "A playlist needs a name" });
        }
        return trimmed;
    }

    /** Nothing is changed that could not be kept. */
    private checkSaving() {
        if (!this.store.canSave()) {
            throw new AppErrorV2({
                statusCode: 503,
                code: ErrorCodes.INVALID_STATE,
                message: "The playlists cannot be saved right now",
            });
        }
    }

    private nameTaken(name: string) {
        return new AppErrorV2({
            statusCode: 409,
            code: ErrorCodes.ALREADY_EXISTS,
            message: "A playlist with that name exists",
            params: { resource: "playlist", name },
        });
    }

    private notFound() {
        return new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "There is no such playlist", params: { resource: "playlist" } });
    }
}

export const playlistService = new PlaylistService();
