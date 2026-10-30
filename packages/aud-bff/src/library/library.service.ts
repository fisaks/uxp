import { EventEmitter } from "events";
import { LibraryAlbum, LibraryArtist, LibraryStatus, LibraryTrack, QueueTrack } from "@aud/common";
import { AppLogger } from "@uxp/bff-common";
import path from "path";
import { readJsonFile, writeJsonFile } from "../storage/json-file";
import { LibraryConfig, audiobookConfig, libraryConfig } from "./library.config";
import { scanLibrary } from "./library-scanner";
import { ScannedAlbumFolder, ScannedTrack } from "./library.types";

const CACHE_VERSION = 1;

type Cache = { version: number; scannedAt: string; tracks: ScannedTrack[]; albumFolders: ScannedAlbumFolder[] };

const toLibraryTrack = ({ id, albumId, artistId, title, artist, trackNo, discNo, durationSec }: ScannedTrack): LibraryTrack => ({
    id,
    albumId,
    artistId,
    title,
    artist,
    trackNo,
    discNo,
    durationSec,
});

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

/**
 * A library, kept in memory: the music or the audiobooks. It is built from the files of its root by the scanner and cached in a JSON
 * file, so after a restart it is there at once while the scan looks for changes in the background. The files are the
 * truth: the cache can be deleted at any time and is rebuilt by a scan.
 */
export type LibraryEventMap = {
    /** A scan has found another library than before: a file added, removed or changed, or another cover picture. */
    changed: [];
};

export class LibraryService extends EventEmitter<LibraryEventMap> {
    private tracks: ScannedTrack[] = [];
    private folders: ScannedAlbumFolder[] = [];
    private artists: LibraryArtist[] = [];
    private artistById = new Map<string, LibraryArtist>();
    private albumById = new Map<string, LibraryAlbum>();
    private albumsByArtist = new Map<string, LibraryAlbum[]>();
    private tracksByAlbum = new Map<string, ScannedTrack[]>();
    private trackById = new Map<string, ScannedTrack>();
    private coverByAlbum = new Map<string, string>();
    private scanning?: Promise<void>;
    private scannedAt?: string;

    /** What the library is made of: when it changes between scans the listeners of "changed" are told. */
    private signature = "";

    constructor(private readonly config: LibraryConfig) {
        super();
    }

    /** Loads the cache, then scans in the background. Never throws. */
    async start() {
        if (!this.config.root) {
            AppLogger.info(undefined, {
                message: `The ${this.config.collection} folder is not set, the ${this.config.collection} library is empty`,
            });
            return;
        }
        await this.loadCache();
        void this.scan();
    }

    /** Scans the music root. A scan that is running is not started again. */
    scan(): Promise<void> {
        const { root } = this.config;
        if (!root) {
            return Promise.resolve();
        }
        this.scanning ??= this.runScan(root).finally(() => (this.scanning = undefined));
        return this.scanning;
    }

    /** False until the library has been read from the cache or a scan, which is when the ids of tracks mean something. */
    hasTracks(): boolean {
        return this.tracks.length > 0;
    }

    getStatus(): LibraryStatus {
        return { scanning: this.scanning !== undefined, scannedAt: this.scannedAt, trackCount: this.tracks.length };
    }

    getArtists(): LibraryArtist[] {
        return this.artists;
    }

    getArtist(artistId: string): LibraryArtist | undefined {
        return this.artistById.get(artistId);
    }

    getAlbum(albumId: string): LibraryAlbum | undefined {
        return this.albumById.get(albumId);
    }

    getAlbums(artistId: string): LibraryAlbum[] {
        return this.albumsByArtist.get(artistId) ?? [];
    }

    getTracks(albumId: string): LibraryTrack[] {
        return (this.tracksByAlbum.get(albumId) ?? []).map(toLibraryTrack);
    }

    /** A track with what the player shows: the cover of its album. */
    getTrack(trackId: string): QueueTrack | undefined {
        const track = this.trackById.get(trackId);
        return (
            track && {
                ...toLibraryTrack(track),
                collection: this.config.collection,
                albumTitle: this.albumById.get(track.albumId)?.title ?? "",
                hasCover: this.coverByAlbum.has(track.albumId),
            }
        );
    }

    /** The full path of the audio file of a track, for the player. */
    getTrackFile(trackId: string): string | undefined {
        const track = this.trackById.get(trackId);
        return track && this.config.root ? path.join(this.config.root, track.file) : undefined;
    }

    /** The full path of the cover picture of an album. */
    getCoverFile(albumId: string): string | undefined {
        const cover = this.coverByAlbum.get(albumId);
        return cover && this.config.root ? path.join(this.config.root, cover) : undefined;
    }

    private async runScan(root: string) {
        try {
            const started = Date.now();
            const previous = new Map(this.tracks.map((track) => [track.file, track]));
            const { tracks, albumFolders, unreadable } = await scanLibrary(root, previous, this.config.idSalt);
            unreadable.forEach((file) => AppLogger.warn(undefined, { message: `Could not read the tags of ${file}, using the file name` }));
            const changed = this.setLibrary(tracks, albumFolders, new Date().toISOString());
            await this.saveCache();
            if (changed) {
                this.emit("changed");
            }
            AppLogger.info(undefined, {
                message: `Scanned the ${this.config.collection} library: ${tracks.length} tracks in ${Date.now() - started} ms`,
            });
        } catch (error) {
            AppLogger.error(undefined, { message: `Could not scan the ${this.config.collection} library`, error });
        }
    }

    private async loadCache() {
        if (!this.config.dataDir) {
            return;
        }
        // No cache yet, or it is damaged: the scan builds it again.
        const cache = await readJsonFile<Cache>(path.join(this.config.dataDir, this.config.cacheFile));
        if (cache?.version === CACHE_VERSION) {
            this.setLibrary(cache.tracks, cache.albumFolders, cache.scannedAt);
        }
    }

    private async saveCache() {
        if (!this.config.dataDir) {
            return;
        }
        try {
            await writeJsonFile(path.join(this.config.dataDir, this.config.cacheFile), {
                version: CACHE_VERSION,
                scannedAt: this.scannedAt ?? "",
                tracks: this.tracks,
                albumFolders: this.folders,
            } satisfies Cache);
        } catch (error) {
            AppLogger.warn(undefined, { message: `Could not save the cache of the ${this.config.collection} library`, error });
        }
    }

    /** Sets the library. The answer is whether it is another library than before, which is what the listeners of "changed" are told. */
    private setLibrary(tracks: ScannedTrack[], folders: ScannedAlbumFolder[], scannedAt: string): boolean {
        const signature = [
            ...tracks.map((track) => `${track.id}:${track.modifiedMs}`),
            ...folders.map((folder) => `${folder.id}:${folder.cover ?? ""}`),
        ].join(",");
        const changed = signature !== this.signature;
        this.signature = signature;
        const sorted = [...tracks].sort(
            this.config.order === "files"
                ? (a, b) => a.file.localeCompare(b.file, undefined, { numeric: true, sensitivity: "base" })
                : (a, b) => (a.discNo ?? 0) - (b.discNo ?? 0) || (a.trackNo ?? 0) - (b.trackNo ?? 0) || a.file.localeCompare(b.file)
        );
        const tracksByAlbum = new Map<string, ScannedTrack[]>();
        sorted.forEach((track) => tracksByAlbum.set(track.albumId, [...(tracksByAlbum.get(track.albumId) ?? []), track]));

        const albums = folders
            .map<LibraryAlbum & { artistName: string }>((folder) => {
                const albumTracks = tracksByAlbum.get(folder.id) ?? [];
                const years = albumTracks.flatMap((t) => (t.year ? [t.year] : []));
                return {
                    id: folder.id,
                    artistId: folder.artistId,
                    artistName: folder.artistName,
                    title: folder.title,
                    year: years.length > 0 ? Math.min(...years) : undefined,
                    trackCount: albumTracks.length,
                    hasCover: folder.cover !== undefined,
                };
            })
            .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));

        const albumsByArtist = new Map<string, LibraryAlbum[]>();
        const albumById = new Map<string, LibraryAlbum>();
        const artistNames = new Map<string, string>();
        for (const { artistName, ...album } of albums) {
            albumsByArtist.set(album.artistId, [...(albumsByArtist.get(album.artistId) ?? []), album]);
            albumById.set(album.id, album);
            artistNames.set(album.artistId, artistName);
        }

        this.tracks = tracks;
        this.folders = folders;
        this.tracksByAlbum = tracksByAlbum;
        this.trackById = new Map(tracks.map((track) => [track.id, track]));
        this.coverByAlbum = new Map(folders.flatMap((f) => (f.cover ? [[f.id, f.cover] as const] : [])));
        this.albumsByArtist = albumsByArtist;
        this.albumById = albumById;
        this.artists = [...artistNames].map(([id, name]) => ({ id, name, albumCount: albumsByArtist.get(id)!.length })).sort(byName);
        this.artistById = new Map(this.artists.map((artist) => [artist.id, artist]));
        this.scannedAt = scannedAt;
        return changed;
    }
}

export const libraryService = new LibraryService(libraryConfig);
export const audiobookService = new LibraryService(audiobookConfig);
