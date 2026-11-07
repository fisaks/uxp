import { LibraryAlbum, LibraryArtist, LibraryTrack, QueueTrack, SpotifyCatalogHealth, SpotifyQueueEntry, SpotifySearchType } from "@aud/common";
import { AppLogger } from "@uxp/bff-common";
import axios, { AxiosInstance } from "axios";
import { libraryConfig } from "../library/library.config";
import { SPOTIFY_CACHE_TTL_MS, SpotifyCache } from "./spotify-cache";

const API = "https://api.spotify.com/v1";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
// A search answers at most this many tracks, a larger limit is refused.
export const SEARCH_PAGE_SIZE = 10;
// The tracks looked up or heard of are kept, so that a queue or a history entry that names one can be played again.
// The oldest are forgotten at this many.
const MAX_TRACKS = 2000;
// The cap is reported at most this often, with the number of tracks forgotten since, so that it can be tuned from the logs.
const EVICTION_LOG_INTERVAL_MS = 60 * 60 * 1000;
// A token is renewed this long before it expires.
const TOKEN_MARGIN_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;
/** Spotify did not answer, or not fully: unlike a missing artist or album, worth asking again. */
export class SpotifyUnavailableError extends Error {
    /** When Spotify allows the call again (epoch ms), when it said so. */
    constructor(
        message: string,
        readonly until?: number
    ) {
        super(message);
    }
}

/** The kind of a call, without the ids and the query: what Spotify limits together. */
const callOf = (path: string) => path.split("?")[0].replace(/\/[A-Za-z0-9]{22}(?=\/|$)/g, "/:id");

const MAX_RETRY_WAIT_SEC = 10;
const URI_PREFIX = "spotify:track:";
const ARTIST_PREFIX = "spotify:artist:";
const ALBUM_PREFIX = "spotify:album:";
// The albums of an artist and the tracks of an album are read in pages, up to this many.
const MAX_ALBUMS = 200;
const MAX_ALBUM_TRACKS = 300;
// The artists and albums that were found are kept like the tracks, the oldest forgotten at this many.
const MAX_ITEMS = 1000;

/** Whether a track id is a track of Spotify (its URI) and not one of the library. */
export const isSpotifyId = (id: string): boolean => id.startsWith(URI_PREFIX);

/** Whether an id is an artist of Spotify, or an album of Spotify, and not one of the library. */
export const isSpotifyArtistId = (id: string): boolean => id.startsWith(ARTIST_PREFIX);
export const isSpotifyAlbumId = (id: string): boolean => id.startsWith(ALBUM_PREFIX);

type ApiImage = { url: string; width: number };
type ApiArtist = { id: string; uri: string; name: string; images?: ApiImage[] };
type ApiAlbum = {
    id: string;
    uri: string;
    name: string;
    release_date?: string;
    total_tracks: number;
    images: ApiImage[];
    artists: { id: string; name: string }[];
};
type Page<T> = { items: (T | null)[]; next?: string | null; total?: number };

type ApiTrack = {
    id: string;
    uri: string;
    name: string;
    duration_ms: number;
    artists: { id: string; name: string }[];
    album: { name: string; images: ApiImage[] };
};
// A track of an album lacks the album, which the album gives.
type ApiAlbumTrack = Omit<ApiTrack, "album"> & { track_number?: number; disc_number?: number };

/** The smallest picture that is at least as wide as a tile of a list (the images come largest first). */
const coverOf = (images: ApiImage[] = []): string | undefined => [...images].reverse().find((image) => image.width >= 128)?.url ?? images[0]?.url;

/** A track of Spotify as a track of the queue: it is not in the library, so its URI is its id and it has no album or artist of its own. */
export const spotifyTrack = (entry: SpotifyQueueEntry): QueueTrack => ({
    id: entry.uri,
    albumId: "",
    artistId: "",
    title: entry.title,
    artist: entry.artist,
    albumTitle: entry.album,
    durationSec: entry.durationSec,
    hasCover: false,
    collection: "music",
    spotify: { coverUrl: entry.coverUrl },
});

const entryOf = (track: ApiTrack): SpotifyQueueEntry => ({
    uri: track.uri,
    title: track.name,
    artist: track.artists.map((artist) => artist.name).join(", "),
    album: track.album.name,
    durationSec: Math.round(track.duration_ms / 1000),
    coverUrl: coverOf(track.album.images),
});

const artistOf = (artist: ApiArtist, albumCount = 0): LibraryArtist => ({
    id: artist.uri,
    name: artist.name,
    albumCount,
    coverAlbumIds: [],
    coverUrl: coverOf(artist.images),
});

const albumOf = (album: ApiAlbum): LibraryAlbum => ({
    id: album.uri,
    artistId: `${ARTIST_PREFIX}${album.artists[0]?.id ?? ""}`,
    title: album.name,
    year: Number.parseInt(album.release_date ?? "", 10) || undefined,
    trackCount: album.total_tracks,
    hasCover: false,
    coverUrl: coverOf(album.images),
});

/** A track of an album as a track of the library's shape, with the Spotify ids. */
const libraryTrackOf = (track: ApiAlbumTrack, album: ApiAlbum): LibraryTrack => ({
    id: track.uri,
    albumId: album.uri,
    artistId: `${ARTIST_PREFIX}${track.artists[0]?.id ?? ""}`,
    title: track.name,
    artist: track.artists.map((artist) => artist.name).join(", "),
    trackNo: track.track_number,
    discNo: track.disc_number,
    durationSec: Math.round(track.duration_ms / 1000),
});

/** The oldest of a map are forgotten at `max`. */
const trim = <T>(map: Map<string, T>, max: number) => {
    for (const key of [...map.keys()].slice(0, Math.max(0, map.size - max))) {
        map.delete(key);
    }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * What Spotify's Web API tells about tracks: search, and the track of a URI (Soloist, which plays, has no lookup). It needs no user:
 * the app's own token (client credentials) is enough for this. The tracks that were found are kept, by URI, so that wherever a track
 * is named (queue, history) it is looked up the same way as the library's, without waiting for Spotify.
 * Not set up (no client id and secret) it finds nothing.
 */
export class SpotifyCatalog {
    /** In the order they were added, the newest last. */
    private entries = new Map<string, SpotifyQueueEntry>();
    private artists = new Map<string, LibraryArtist>();
    private albums = new Map<string, LibraryAlbum>();
    /** What is being asked of Spotify at the moment, so that the same question is not asked twice at once. */
    private pending = new Map<string, Promise<unknown>>();
    readonly cache = new SpotifyCache(libraryConfig.dataDir);
    private token?: { value: string; expiresAt: number };
    private tokenRequest?: Promise<string>;
    private lastOk?: boolean;
    private forgotten = 0;
    private lastEvictionLogAt = 0;

    private readonly http: AxiosInstance = axios.create({ timeout: REQUEST_TIMEOUT_MS });

    constructor(
        private readonly clientId: string | undefined,
        private readonly clientSecret: string | undefined
    ) {}

    get enabled(): boolean {
        return Boolean(this.clientId && this.clientSecret);
    }

    /** The track of a URI that is known, without asking Spotify. */
    getTrack(id: string): QueueTrack | undefined {
        const entry = this.entries.get(id);
        return entry && spotifyTrack(entry);
    }

    /** The entry of a URI that is known, as it was found. */
    getEntry(uri: string): SpotifyQueueEntry | undefined {
        return this.entries.get(uri);
    }

    add(entries: SpotifyQueueEntry[]) {
        for (const entry of entries) {
            // Added again, it is the newest.
            this.entries.delete(entry.uri);
            this.entries.set(entry.uri, entry);
        }
        if (this.entries.size > MAX_TRACKS) {
            const evict = [...this.entries.keys()].slice(0, this.entries.size - MAX_TRACKS);
            for (const uri of evict) {
                this.entries.delete(uri);
            }
            this.reportEviction(evict.length);
        }
    }

    private reportEviction(count: number) {
        this.forgotten += count;
        if (this.forgotten > 0 && Date.now() - this.lastEvictionLogAt >= EVICTION_LOG_INTERVAL_MS) {
            AppLogger.warn(undefined, {
                message: `[Spotify] The catalog is at its limit of ${MAX_TRACKS} tracks, ${this.forgotten} forgotten since the last report`,
            });
            this.forgotten = 0;
            this.lastEvictionLogAt = Date.now();
        }
    }

    /** What matches, `SEARCH_PAGE_SIZE` of each kind asked for from `offset` on. They are known afterwards. */
    async search(
        query: string,
        offset = 0,
        types: SpotifySearchType[] = ["track"]
    ): Promise<{ tracks: SpotifyQueueEntry[]; artists: LibraryArtist[]; albums: LibraryAlbum[] }> {
        const params = new URLSearchParams({ q: query, type: types.join(","), limit: String(SEARCH_PAGE_SIZE), offset: String(offset) });
        const { body } = await this.request<{ tracks?: Page<ApiTrack>; artists?: Page<ApiArtist>; albums?: Page<ApiAlbum> }>(`/search?${params}`);
        const tracks = (body?.tracks?.items ?? []).flatMap((track) => (track ? entryOf(track) : []));
        const artists = (body?.artists?.items ?? []).flatMap((artist) => (artist ? artistOf(artist) : []));
        const albums = (body?.albums?.items ?? []).flatMap((album) => (album ? albumOf(album) : []));
        this.add(tracks);
        this.addItems(this.artists, artists);
        this.addItems(this.albums, albums);
        return { tracks, artists, albums };
    }

    /**
     * An artist of Spotify with the albums and singles of it, or none when Spotify has no such artist. It is asked for once a day: in
     * between, and when Spotify does not answer, what was told last is given.
     */
    getArtistAlbums(artistUri: string): Promise<{ artist: LibraryArtist; albums: LibraryAlbum[] } | undefined> {
        const cached = this.cache.artist(artistUri);
        if (cached && Date.now() - cached.at < SPOTIFY_CACHE_TTL_MS) {
            this.addItems(this.artists, [cached.artist]);
            this.addItems(this.albums, cached.albums);
            return Promise.resolve({ artist: cached.artist, albums: cached.albums });
        }
        return this.once(artistUri, async () => {
            try {
                return await this.readArtistAlbums(artistUri);
            } catch (error) {
                if (cached && error instanceof SpotifyUnavailableError) {
                    AppLogger.warn(undefined, { message: `[Spotify] ${error.message}, serving what it said ${Math.round((Date.now() - cached.at) / 3_600_000)} h ago` });
                    return { artist: cached.artist, albums: cached.albums };
                }
                throw error;
            }
        });
    }

    private async readArtistAlbums(artistUri: string): Promise<{ artist: LibraryArtist; albums: LibraryAlbum[] } | undefined> {
        const id = artistUri.slice(ARTIST_PREFIX.length);
        const [{ body: artist, gone }, { items: albums, complete }] = await Promise.all([
            this.request<ApiArtist>(`/artists/${id}`),
            this.readPages<ApiAlbum>(`/artists/${id}/albums?include_groups=album,single&limit=${SEARCH_PAGE_SIZE}`, MAX_ALBUMS),
        ]);
        if (!artist) {
            if (gone) return undefined;
            throw new SpotifyUnavailableError(`Spotify did not give the artist ${id}`, this.cache.blockedUntil(callOf(`/artists/${id}`)));
        }
        if (!complete) {
            // Not an empty or a short list as if it were the answer.
            throw new SpotifyUnavailableError(`Spotify did not give all the albums of ${artist.name}`, this.cache.blockedUntil(callOf(`/artists/${id}/albums`)));
        }
        const found = albums.map(albumOf);
        const known = artistOf(artist, found.length);
        this.addItems(this.artists, [known]);
        this.addItems(this.albums, found);
        this.cache.saveArtist(artistUri, known, found);
        return { artist: known, albums: found };
    }

    /** An album of Spotify with its artist and tracks, which are known afterwards; none when Spotify has no such album or does not answer. */
    getAlbumTracks(albumUri: string): Promise<{ artist: LibraryArtist; album: LibraryAlbum; tracks: LibraryTrack[] } | undefined> {
        const cached = this.cache.album(albumUri);
        const serve = (hit: NonNullable<typeof cached>) => {
            this.add(hit.entries);
            this.addItems(this.artists, [hit.artist]);
            this.addItems(this.albums, [hit.album]);
            return { artist: hit.artist, album: hit.album, tracks: hit.tracks };
        };
        if (cached && Date.now() - cached.at < SPOTIFY_CACHE_TTL_MS) {
            return Promise.resolve(serve(cached));
        }
        return this.once(albumUri, async () => {
            try {
                return await this.readAlbumTracks(albumUri);
            } catch (error) {
                if (cached && error instanceof SpotifyUnavailableError) {
                    AppLogger.warn(undefined, { message: `[Spotify] ${error.message}, serving what it said ${Math.round((Date.now() - cached.at) / 3_600_000)} h ago` });
                    return serve(cached);
                }
                throw error;
            }
        });
    }

    /** Runs the question once for all that ask it at the same time. */
    private once<T>(key: string, ask: () => Promise<T>): Promise<T> {
        const running = this.pending.get(key) as Promise<T> | undefined;
        if (running) return running;
        const promise = ask().finally(() => this.pending.delete(key));
        this.pending.set(key, promise);
        return promise;
    }

    private async readAlbumTracks(albumUri: string): Promise<{ artist: LibraryArtist; album: LibraryAlbum; tracks: LibraryTrack[] } | undefined> {
        const id = albumUri.slice(ALBUM_PREFIX.length);
        const { body, gone } = await this.request<ApiAlbum & { tracks: Page<ApiAlbumTrack> }>(`/albums/${id}`);
        if (!body) {
            if (gone) return undefined;
            throw new SpotifyUnavailableError(`Spotify did not give the album ${id}`, this.cache.blockedUntil(callOf(`/albums/${id}`)));
        }
        const more = body.tracks.next ? await this.readPages<ApiAlbumTrack>(body.tracks.next.slice(API.length), MAX_ALBUM_TRACKS) : undefined;
        if (more && !more.complete) {
            throw new SpotifyUnavailableError(`Spotify did not give all the tracks of ${body.name}`, this.cache.blockedUntil(callOf(`/albums/${id}/tracks`)));
        }
        const rest = more?.items ?? [];
        const apiTracks = [...body.tracks.items.flatMap((track) => (track ? [track] : [])), ...rest];
        const album = albumOf(body);
        // The artist is what the album names first; its picture is not asked for.
        const artist = this.artists.get(album.artistId) ?? { id: album.artistId, name: body.artists[0]?.name ?? "", albumCount: 0, coverAlbumIds: [] };
        const entries = apiTracks.map((track) => entryOf({ ...track, album: body }));
        const tracks = apiTracks.map((track) => libraryTrackOf(track, body));
        this.add(entries);
        this.addItems(this.albums, [album]);
        this.cache.saveAlbum(albumUri, { artist, album, tracks, entries });
        return { artist, album, tracks };
    }

    /** The artist of Spotify that is known, without asking Spotify. */
    getArtist(id: string): LibraryArtist | undefined {
        return this.artists.get(id);
    }

    /** The album of Spotify that is known, without asking Spotify. */
    getAlbum(id: string): LibraryAlbum | undefined {
        return this.albums.get(id);
    }

    /**
     * Makes the tracks of the URIs known that are not yet, one request each (there is no lookup of several). Those that Spotify does not
     * have stay unknown. Returns false when some could not be asked for, because Spotify is not set up or did not answer: they may exist.
     */
    async resolve(uris: string[]): Promise<boolean> {
        let complete = true;
        const missing = [...new Set(uris)].filter((uri) => isSpotifyId(uri) && !this.entries.has(uri));
        // A few at a time: a long queue is no burst of requests.
        for (let i = 0; i < missing.length; i += 4) {
            await Promise.all(
                missing.slice(i, i + 4).map(async (uri) => {
                    const { body, gone } = await this.request<ApiTrack>(`/tracks/${uri.slice(URI_PREFIX.length)}`);
                    if (body) {
                        this.add([entryOf(body)]);
                    } else if (!gone) {
                        complete = false;
                    }
                })
            );
        }
        return complete;
    }

    private addItems<T extends { id: string }>(map: Map<string, T>, items: T[]) {
        for (const item of items) {
            map.delete(item.id);
            map.set(item.id, item);
        }
        trim(map, MAX_ITEMS);
    }

    /** The items of a paged list, up to `max`. `complete` is false when a page could not be had, so that the items are not all there. */
    private async readPages<T>(firstPath: string, max: number): Promise<{ items: T[]; complete: boolean }> {
        const items: T[] = [];
        let path: string | undefined = firstPath;
        let pages = 0;
        while (path && items.length < max) {
            const { body }: { body?: Page<T> } = await this.request<Page<T>>(path);
            if (!body) {
                AppLogger.warn(undefined, { message: `[Spotify] ${firstPath.split("?")[0]} stopped at page ${pages + 1} with ${items.length} items` });
                return { items, complete: false };
            }
            pages++;
            items.push(...body.items.flatMap((item) => (item ? [item] : [])));
            path = body.next ? body.next.slice(API.length) : undefined;
        }
        AppLogger.info(undefined, { message: `[Spotify] ${firstPath.split("?")[0]} read ${items.length} items in ${pages} pages` });
        return { items, complete: true };
    }

    /** For the health check: whether it is set up and whether the last request, or when there was none a new token, was answered. */
    async health(): Promise<SpotifyCatalogHealth> {
        if (!this.enabled) {
            return { enabled: false, ok: false };
        }
        if (this.lastOk === undefined) {
            await this.accessToken().catch(() => undefined);
        }
        return { enabled: true, ok: this.lastOk === true };
    }

    private async accessToken(): Promise<string> {
        if (this.token && Date.now() < this.token.expiresAt - TOKEN_MARGIN_MS) {
            return this.token.value;
        }
        // Requests that come together share one token request.
        this.tokenRequest ??= this.fetchToken().finally(() => (this.tokenRequest = undefined));
        return this.tokenRequest;
    }

    private async fetchToken(): Promise<string> {
        try {
            const { data } = await this.http.post<{ access_token: string; expires_in: number }>(
                TOKEN_URL,
                new URLSearchParams({ grant_type: "client_credentials" }),
                { auth: { username: this.clientId ?? "", password: this.clientSecret ?? "" } }
            );
            this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
            this.lastOk ??= true;
            return data.access_token;
        } catch (error) {
            this.lastOk = false;
            throw error;
        }
    }

    /** A GET of the Web API: the body, or none when Spotify does not give it, which is logged. `gone` tells it is not there, not that it could not be asked. */
    private async request<T>(path: string, retried = false): Promise<{ body?: T; gone?: boolean }> {
        if (!this.enabled) {
            return {};
        }
        const until = this.cache.blockedUntil(callOf(path));
        if (until !== undefined) {
            // Asking would be in vain and may lengthen the limit.
            AppLogger.info(undefined, { message: `[Spotify] ${path.split("?")[0]} not asked for, limited until ${new Date(until).toISOString()}` });
            return {};
        }
        try {
            const { data } = await this.http.get<T>(`${API}${path}`, { headers: { Authorization: `Bearer ${await this.accessToken()}` } });
            this.lastOk = true;
            return { body: data };
        } catch (error) {
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            if (status === 401 && !retried) {
                // The token was refused before it ran out: a new one is asked for.
                this.token = undefined;
                return this.request<T>(path, true);
            }
            if (status === 429 && !retried) {
                const waitSec = Number(axios.isAxiosError(error) ? error.response?.headers["retry-after"] : undefined) || 1;
                AppLogger.warn(undefined, { message: `[Spotify] ${path.split("?")[0]} answered 429, retry after ${waitSec} s${waitSec <= MAX_RETRY_WAIT_SEC ? ", waiting" : ", too long to wait"}` });
                if (waitSec <= MAX_RETRY_WAIT_SEC) {
                    await sleep(waitSec * 1000);
                    return this.request<T>(path, true);
                }
                this.cache.block(callOf(path), Date.now() + waitSec * 1000);
            }
            const where = path.split("?")[0];
            if (status !== undefined) {
                // A track that is gone is not a fault of the connection.
                this.lastOk = status === 404 ? this.lastOk : false;
                const retryAfter = axios.isAxiosError(error) ? error.response?.headers["retry-after"] : undefined;
                AppLogger.warn(undefined, { message: `[Spotify] ${where} answered ${status}${retryAfter ? `, retry after ${retryAfter} s` : ""}` });
                return { gone: status === 404 };
            }
            this.lastOk = false;
            AppLogger.warn(undefined, { message: `[Spotify] ${where} failed`, error });
            return {};
        }
    }
}

export const spotifyCatalog = new SpotifyCatalog(process.env.AUD_SPOTIFY_CLIENT_ID || undefined, process.env.AUD_SPOTIFY_CLIENT_SECRET || undefined);
