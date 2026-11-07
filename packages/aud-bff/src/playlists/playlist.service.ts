import { MAX_ARTIST_COVERS, MAX_PLAYLIST_NAME_LENGTH, Playlist, PlaylistEntry, PlaylistSummary, QueueTrack, SpotifyQueueEntry } from "@aud/common";
import { AppErrorV2, AppLogger, tryReadJsonFile, SerializedJsonWriter } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import path from "path";
import { libraryConfig } from "../library/library.config";
import { libraryService } from "../library/library.service";
import { isSpotifyId, spotifyCatalog } from "../player/spotify-catalog";

const FILE = "playlists.json";

type StoredPlaylist = {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    lastPlayedAt?: string;
    /** The id is what counts, the name ("Artist - Title") is for whoever reads the file and for a track that is gone. */
    tracks: StoredTrack[];
};

/** A track of Spotify keeps what is known of it, so that a playlist needs no lookup at Spotify. */
type StoredTrack = { id: string; name: string; spotify?: SpotifyQueueEntry };

/** The tracks of the library and of Spotify, by id. */
type TrackSource = { getTrack(id: string): QueueTrack | undefined };

/** Where the entries of the Spotify tracks of the playlists are kept known. */
type SpotifyEntries = { getEntry(uri: string): SpotifyQueueEntry | undefined; add(entries: SpotifyQueueEntry[]): void };

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
export type PlaylistEventMap = {
    /** A playlist has been made, changed or deleted. */
    changed: [];
};

export class PlaylistService extends EventEmitter<PlaylistEventMap> {
    private playlists: StoredPlaylist[] = [];
    private readonly writer?: SerializedJsonWriter;

    constructor(
        private readonly tracks: TrackSource,
        private readonly spotify: SpotifyEntries,
        private readonly dataDir?: string
    ) {
        super();
        if (dataDir) {
            this.writer = new SerializedJsonWriter(path.join(dataDir, FILE), (error) =>
                AppLogger.warn(undefined, { message: "Could not save the playlists", error })
            );
        }
    }

    async load(): Promise<void> {
        if (!this.dataDir) {
            AppLogger.info(undefined, { message: "AUD_DATA_DIR is not set, the playlists are lost at a restart" });
            return;
        }
        const file = await tryReadJsonFile<{ playlists?: unknown[] }>(path.join(this.dataDir, FILE));
        this.playlists = (file?.playlists ?? []).filter(isStoredPlaylist);
        // The tracks of Spotify are known from now on, wherever a track is looked up.
        this.spotify.add(this.playlists.flatMap((playlist) => playlist.tracks.flatMap((track) => (track.spotify ? [track.spotify] : []))));
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
        this.emit("changed");
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
        this.emit("changed");
        return this.list();
    }

    /** Remembers that the playlist was played now. An unknown playlist (deleted meanwhile) is ignored. */
    async markPlayed(id: string): Promise<void> {
        const playlist = this.playlists.find((candidate) => candidate.id === id);
        if (!playlist) return;
        playlist.lastPlayedAt = new Date().toISOString();
        await this.save();
        this.emit("changed");
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
        this.emit("changed");
        return this.toPlaylist(playlist);
    }

    /** Tracks that are neither in the library nor known from Spotify are left out. */
    private resolve(trackIds: string[]): StoredTrack[] {
        return trackIds.flatMap((id) => {
            const track = this.tracks.getTrack(id);
            if (!track) return [];
            const spotify = isSpotifyId(id) ? this.spotify.getEntry(id) : undefined;
            return [{ id, name: nameOf(track), ...(spotify && { spotify }) }];
        });
    }

    private toPlaylist(playlist: StoredPlaylist): Playlist {
        const entries = playlist.tracks.map<PlaylistEntry>(({ id, name }) => {
            const track = this.tracks.getTrack(id);
            return { id, name: track ? nameOf(track) : name, track };
        });
        return { id: playlist.id, name: playlist.name, createdAt: playlist.createdAt, updatedAt: playlist.updatedAt, entries };
    }

    private summarize(playlist: StoredPlaylist): PlaylistSummary {
        const durationSec = playlist.tracks.reduce((sum, { id }) => sum + (this.tracks.getTrack(id)?.durationSec ?? 0), 0);
        const coverAlbumIds = new Set<string>();
        const coverUrls = new Set<string>();
        for (const { id } of playlist.tracks) {
            const track = this.tracks.getTrack(id);
            if (track?.hasCover) coverAlbumIds.add(track.albumId);
            if (track?.spotify?.coverUrl) coverUrls.add(track.spotify.coverUrl);
            if (coverAlbumIds.size + coverUrls.size >= MAX_ARTIST_COVERS) break;
        }
        return {
            id: playlist.id,
            name: playlist.name,
            trackCount: playlist.tracks.length,
            durationSec,
            updatedAt: playlist.updatedAt,
            lastPlayedAt: playlist.lastPlayedAt,
            coverAlbumIds: [...coverAlbumIds],
            coverUrls: [...coverUrls],
        };
    }

    private save(): Promise<void> {
        return this.writer?.write({ playlists: this.playlists }) ?? Promise.resolve();
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

export const playlistService = new PlaylistService(
    { getTrack: (id) => (isSpotifyId(id) ? spotifyCatalog.getTrack(id) : libraryService.getTrack(id)) },
    spotifyCatalog,
    libraryConfig.dataDir
);
