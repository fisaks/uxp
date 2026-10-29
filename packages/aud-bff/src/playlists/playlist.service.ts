import { MAX_PLAYLIST_NAME_LENGTH, Playlist, PlaylistEntry, PlaylistSummary, QueueTrack } from "@aud/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { randomUUID } from "crypto";
import path from "path";
import { libraryConfig } from "../library/library.config";
import { libraryService } from "../library/library.service";
import { readJsonFile, writeJsonFile } from "../storage/json-file";

const FILE = "playlists.json";

type StoredPlaylist = {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    /** The id is what counts, the name ("Artist - Title") is for whoever reads the file and for a track that is gone. */
    tracks: { id: string; name: string }[];
};

type TrackSource = { getTrack(id: string): QueueTrack | undefined };

const nameOf = (track: QueueTrack) => `${track.artist} - ${track.title}`;

const isStoredPlaylist = (value: unknown): value is StoredPlaylist => {
    const playlist = value as StoredPlaylist | undefined;
    return (
        typeof playlist?.id === "string" &&
        typeof playlist.name === "string" &&
        Array.isArray(playlist.tracks) &&
        playlist.tracks.every((track) => typeof track?.id === "string")
    );
};

/**
 * The playlists of the household, kept in memory and in a JSON file in the data folder. Every change is written at once,
 * one after the other. Without a data folder they are only kept until the next restart.
 */
export class PlaylistService {
    private playlists: StoredPlaylist[] = [];
    private saving: Promise<void> = Promise.resolve();

    constructor(
        private readonly library: TrackSource,
        private readonly dataDir?: string
    ) {}

    async load(): Promise<void> {
        if (!this.dataDir) {
            AppLogger.info(undefined, { message: "AUD_DATA_DIR is not set, the playlists are lost at a restart" });
            return;
        }
        const file = await readJsonFile<{ playlists?: unknown[] }>(path.join(this.dataDir, FILE));
        this.playlists = (file?.playlists ?? []).filter(isStoredPlaylist);
    }

    list(): PlaylistSummary[] {
        return [...this.playlists]
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
            .map((playlist) => this.summarize(playlist));
    }

    get(id: string): Playlist {
        return this.toPlaylist(this.require(id));
    }

    async create(name: string, trackIds: string[]): Promise<Playlist> {
        const now = new Date().toISOString();
        const playlist: StoredPlaylist = {
            id: randomUUID(),
            name: this.requireName(name),
            createdAt: now,
            updatedAt: now,
            tracks: this.resolve(trackIds),
        };
        this.playlists.push(playlist);
        await this.save();
        return this.toPlaylist(playlist);
    }

    async rename(id: string, name: string): Promise<Playlist> {
        const playlist = this.require(id);
        playlist.name = this.requireName(name);
        return this.changed(playlist);
    }

    async delete(id: string): Promise<PlaylistSummary[]> {
        this.require(id);
        this.playlists = this.playlists.filter((playlist) => playlist.id !== id);
        await this.save();
        return this.list();
    }

    async addTracks(id: string, trackIds: string[]): Promise<Playlist> {
        const playlist = this.require(id);
        playlist.tracks.push(...this.resolve(trackIds));
        return this.changed(playlist);
    }

    async removeTrack(id: string, index: number): Promise<Playlist> {
        const playlist = this.require(id);
        this.requireIndex(playlist, index);
        playlist.tracks.splice(index, 1);
        return this.changed(playlist);
    }

    async moveTrack(id: string, from: number, to: number): Promise<Playlist> {
        const playlist = this.require(id);
        this.requireIndex(playlist, from);
        this.requireIndex(playlist, to);
        playlist.tracks.splice(to, 0, ...playlist.tracks.splice(from, 1));
        return this.changed(playlist);
    }

    private async changed(playlist: StoredPlaylist): Promise<Playlist> {
        playlist.updatedAt = new Date().toISOString();
        await this.save();
        return this.toPlaylist(playlist);
    }

    /** Tracks that are not in the library are left out. */
    private resolve(trackIds: string[]): StoredPlaylist["tracks"] {
        return trackIds.flatMap((id) => {
            const track = this.library.getTrack(id);
            return track ? [{ id, name: nameOf(track) }] : [];
        });
    }

    private toPlaylist(playlist: StoredPlaylist): Playlist {
        const entries = playlist.tracks.map<PlaylistEntry>(({ id, name }) => {
            const track = this.library.getTrack(id);
            return { id, name: track ? nameOf(track) : name, track };
        });
        return { id: playlist.id, name: playlist.name, createdAt: playlist.createdAt, updatedAt: playlist.updatedAt, entries };
    }

    private summarize(playlist: StoredPlaylist): PlaylistSummary {
        const durationSec = playlist.tracks.reduce((sum, { id }) => sum + (this.library.getTrack(id)?.durationSec ?? 0), 0);
        return { id: playlist.id, name: playlist.name, trackCount: playlist.tracks.length, durationSec, updatedAt: playlist.updatedAt };
    }

    /** Saves after the saves that are already waiting, so a burst of changes is written in order and the last one wins. */
    private save(): Promise<void> {
        if (!this.dataDir) {
            return Promise.resolve();
        }
        const file = path.join(this.dataDir, FILE);
        const content = { playlists: this.playlists };
        this.saving = this.saving
            .then(() => writeJsonFile(file, content))
            .catch((error) => AppLogger.warn(undefined, { message: "Could not save the playlists", error }));
        return this.saving;
    }

    private require(id: string): StoredPlaylist {
        const playlist = this.playlists.find((candidate) => candidate.id === id);
        if (!playlist) {
            throw new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "Unknown playlist" });
        }
        return playlist;
    }

    private requireName(name: string): string {
        const trimmed = name.trim();
        if (trimmed === "" || trimmed.length > MAX_PLAYLIST_NAME_LENGTH) {
            throw new AppErrorV2({
                statusCode: 400,
                code: ErrorCodes.VALIDATION,
                message: "A playlist needs a name of 1 to 100 characters",
            });
        }
        return trimmed;
    }

    private requireIndex(playlist: StoredPlaylist, index: number) {
        if (index >= playlist.tracks.length) {
            throw new AppErrorV2({ statusCode: 400, code: ErrorCodes.VALIDATION, message: `There is no track ${index} in the playlist` });
        }
    }
}

export const playlistService = new PlaylistService(libraryService, libraryConfig.dataDir);
