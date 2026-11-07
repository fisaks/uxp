import { LibraryAlbum, LibraryArtist, LibraryTrack, SpotifyQueueEntry } from "@aud/common";
import { AppLogger } from "@uxp/bff-common";
import path from "path";
import { readJsonFile, SerializedJsonWriter } from "../storage/json-file";

const FILE = "spotify-cache.json";
/** How long what Spotify told about an artist or an album is taken as it is, without asking again. */
export const SPOTIFY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// The oldest are forgotten at this many of each.
const MAX_ENTRIES = 2000;

export type CachedArtist = { at: number; artist: LibraryArtist; albums: LibraryAlbum[] };
/** `entries` are the tracks as the queue plays them, which the catalog must know again when the album is served from here. */
export type CachedAlbum = { at: number; artist: LibraryArtist; album: LibraryAlbum; tracks: LibraryTrack[]; entries: SpotifyQueueEntry[] };

type Stored = {
    artists: Record<string, CachedArtist>;
    albums: Record<string, CachedAlbum>;
    /** Until when Spotify has told us not to ask for a kind of call (epoch ms), by the call without its ids. */
    blocked: Record<string, number>;
};

const forgetOldest = <T extends { at: number }>(items: Map<string, T>) => {
    const oldest = [...items].sort(([, a], [, b]) => a.at - b.at).slice(0, Math.max(0, items.size - MAX_ENTRIES));
    oldest.forEach(([key]) => items.delete(key));
};

/**
 * What Spotify said about artists (with their albums) and albums (with their tracks), in `spotify-cache.json` in the data folder,
 * so that a visit costs a call to Spotify once a day at most, and a restart does not start over. Also where it is kept that Spotify
 * limited a kind of call for a long time (Retry-After), so that no call is made until then. Without a data folder it only lives
 * until the restart.
 */
export class SpotifyCache {
    private artists = new Map<string, CachedArtist>();
    private albums = new Map<string, CachedAlbum>();
    private blocked = new Map<string, number>();
    private readonly writer?: SerializedJsonWriter;

    constructor(private readonly dataDir?: string) {
        this.writer =
            dataDir === undefined
                ? undefined
                : new SerializedJsonWriter(path.join(dataDir, FILE), (error) => AppLogger.warn(undefined, { message: "Could not save the Spotify cache", error }));
    }

    async load() {
        const saved = this.dataDir ? await readJsonFile<Partial<Stored>>(path.join(this.dataDir, FILE)) : undefined;
        this.artists = new Map(Object.entries(saved?.artists ?? {}));
        this.albums = new Map(Object.entries(saved?.albums ?? {}));
        this.blocked = new Map(Object.entries(saved?.blocked ?? {}).filter(([, until]) => until > Date.now()));
    }

    artist(uri: string): CachedArtist | undefined {
        return this.artists.get(uri);
    }

    album(uri: string): CachedAlbum | undefined {
        return this.albums.get(uri);
    }

    saveArtist(uri: string, artist: LibraryArtist, albums: LibraryAlbum[]) {
        this.artists.set(uri, { at: Date.now(), artist, albums });
        forgetOldest(this.artists);
        this.write();
    }

    saveAlbum(uri: string, value: Omit<CachedAlbum, "at">) {
        this.albums.set(uri, { at: Date.now(), ...value });
        forgetOldest(this.albums);
        this.write();
    }

    /** When the kind of call may be made again (epoch ms), or none when it may be made now. */
    blockedUntil(call: string): number | undefined {
        const until = this.blocked.get(call);
        if (until !== undefined && until <= Date.now()) {
            this.blocked.delete(call);
            this.write();
            return undefined;
        }
        return until;
    }

    block(call: string, until: number) {
        this.blocked.set(call, until);
        this.write();
    }

    private write() {
        void this.writer?.write({
            artists: Object.fromEntries(this.artists),
            albums: Object.fromEntries(this.albums),
            blocked: Object.fromEntries(this.blocked),
        } satisfies Stored);
    }
}
