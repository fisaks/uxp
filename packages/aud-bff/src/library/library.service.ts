import { LibraryAlbum, LibraryArtist, LibraryTrack } from "@aud/common";
import { AppLogger } from "@uxp/bff-common";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { LibraryConfig, libraryConfig } from "./library.config";
import { scanLibrary } from "./library-scanner";
import { ScannedAlbumFolder, ScannedTrack } from "./library.types";

const CACHE_FILE = "library.json";
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
 * The music library, kept in memory. It is built from the files of the music root by the scanner and cached in a JSON
 * file, so after a restart it is there at once while the scan looks for changes in the background. The files are the
 * truth: the cache can be deleted at any time and is rebuilt by a scan.
 */
export class LibraryService {
    private tracks: ScannedTrack[] = [];
    private folders: ScannedAlbumFolder[] = [];
    private artists: LibraryArtist[] = [];
    private albumsByArtist = new Map<string, LibraryAlbum[]>();
    private tracksByAlbum = new Map<string, ScannedTrack[]>();
    private trackById = new Map<string, ScannedTrack>();
    private coverByAlbum = new Map<string, string>();
    private scanning?: Promise<void>;
    private scannedAt?: string;

    constructor(private readonly config: LibraryConfig) {}

    /** Loads the cache, then scans in the background. Never throws. */
    async start() {
        if (!this.config.musicRoot) {
            AppLogger.info(undefined, { message: "AUD_MUSIC_ROOT is not set, the music library is empty" });
            return;
        }
        await this.loadCache();
        void this.scan();
    }

    /** Scans the music root. A scan that is running is not started again. */
    scan(): Promise<void> {
        const { musicRoot } = this.config;
        if (!musicRoot) {
            return Promise.resolve();
        }
        this.scanning ??= this.runScan(musicRoot).finally(() => (this.scanning = undefined));
        return this.scanning;
    }

    getStatus() {
        return { scanning: this.scanning !== undefined, scannedAt: this.scannedAt, trackCount: this.tracks.length };
    }

    getArtists(): LibraryArtist[] {
        return this.artists;
    }

    getAlbums(artistId: string): LibraryAlbum[] {
        return this.albumsByArtist.get(artistId) ?? [];
    }

    getTracks(albumId: string): LibraryTrack[] {
        return (this.tracksByAlbum.get(albumId) ?? []).map(toLibraryTrack);
    }

    /** The full path of the audio file of a track, for the player. */
    getTrackFile(trackId: string): string | undefined {
        const track = this.trackById.get(trackId);
        return track && this.config.musicRoot ? path.join(this.config.musicRoot, track.file) : undefined;
    }

    /** The full path of the cover picture of an album. */
    getCoverFile(albumId: string): string | undefined {
        const cover = this.coverByAlbum.get(albumId);
        return cover && this.config.musicRoot ? path.join(this.config.musicRoot, cover) : undefined;
    }

    private async runScan(musicRoot: string) {
        try {
            const started = Date.now();
            const previous = new Map(this.tracks.map((track) => [track.file, track]));
            const { tracks, albumFolders, unreadable } = await scanLibrary(musicRoot, previous);
            unreadable.forEach((file) => AppLogger.warn(undefined, { message: `Could not read the tags of ${file}, using the file name` }));
            this.setLibrary(tracks, albumFolders, new Date().toISOString());
            await this.saveCache();
            AppLogger.info(undefined, { message: `Scanned the music library: ${tracks.length} tracks in ${Date.now() - started} ms` });
        } catch (error) {
            AppLogger.error(undefined, { message: "Could not scan the music library", error });
        }
    }

    private async loadCache() {
        if (!this.config.dataDir) {
            return;
        }
        try {
            const cache: Cache = JSON.parse(await readFile(path.join(this.config.dataDir, CACHE_FILE), "utf8"));
            if (cache.version === CACHE_VERSION) {
                this.setLibrary(cache.tracks, cache.albumFolders, cache.scannedAt);
            }
        } catch {
            // No cache yet, or it is damaged: the scan builds it again.
        }
    }

    /** Written to a temporary file first, so a stop in the middle does not leave a damaged cache. */
    private async saveCache() {
        if (!this.config.dataDir) {
            return;
        }
        try {
            const file = path.join(this.config.dataDir, CACHE_FILE);
            const cache: Cache = {
                version: CACHE_VERSION,
                scannedAt: this.scannedAt ?? "",
                tracks: this.tracks,
                albumFolders: this.folders,
            };
            await mkdir(this.config.dataDir, { recursive: true });
            await writeFile(`${file}.tmp`, JSON.stringify(cache, null, 2));
            await rename(`${file}.tmp`, file);
        } catch (error) {
            AppLogger.warn(undefined, { message: "Could not save the cache of the music library", error });
        }
    }

    private setLibrary(tracks: ScannedTrack[], folders: ScannedAlbumFolder[], scannedAt: string) {
        const sorted = [...tracks].sort(
            (a, b) => (a.discNo ?? 0) - (b.discNo ?? 0) || (a.trackNo ?? 0) - (b.trackNo ?? 0) || a.file.localeCompare(b.file)
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
        const artistNames = new Map<string, string>();
        for (const { artistName, ...album } of albums) {
            albumsByArtist.set(album.artistId, [...(albumsByArtist.get(album.artistId) ?? []), album]);
            artistNames.set(album.artistId, artistName);
        }

        this.tracks = tracks;
        this.folders = folders;
        this.tracksByAlbum = tracksByAlbum;
        this.trackById = new Map(tracks.map((track) => [track.id, track]));
        this.coverByAlbum = new Map(folders.flatMap((f) => (f.cover ? [[f.id, f.cover] as const] : [])));
        this.albumsByArtist = albumsByArtist;
        this.artists = [...artistNames].map(([id, name]) => ({ id, name, albumCount: albumsByArtist.get(id)!.length })).sort(byName);
        this.scannedAt = scannedAt;
    }
}

export const libraryService = new LibraryService(libraryConfig);
