import { QueueTrack, SpotifyCatalogHealth, SpotifyQueueEntry } from "@aud/common";
import { AppLogger } from "@uxp/bff-common";
import axios, { AxiosInstance } from "axios";

const API = "https://api.spotify.com/v1";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
// A search answers at most this many tracks, a larger limit is refused.
export const SEARCH_PAGE_SIZE = 10;
// The tracks looked up or heard of are kept, so that a queue or a history entry that names one can be played again.
// The oldest are forgotten at this many.
const MAX_TRACKS = 2000;
// A token is renewed this long before it expires.
const TOKEN_MARGIN_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRY_WAIT_SEC = 10;
const URI_PREFIX = "spotify:track:";

/** Whether a track id is a track of Spotify (its URI) and not one of the library. */
export const isSpotifyId = (id: string): boolean => id.startsWith(URI_PREFIX);

type ApiTrack = {
    id: string;
    uri: string;
    name: string;
    duration_ms: number;
    artists: { name: string }[];
    album: { name: string; images: { url: string; width: number }[] };
};

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
    // The smallest picture that is at least as wide as a tile of a list (the images come largest first).
    coverUrl: [...track.album.images].reverse().find((image) => image.width >= 128)?.url ?? track.album.images[0]?.url,
});

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
    private token?: { value: string; expiresAt: number };
    private tokenRequest?: Promise<string>;
    private lastOk?: boolean;

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
        for (const uri of [...this.entries.keys()].slice(0, Math.max(0, this.entries.size - MAX_TRACKS))) {
            this.entries.delete(uri);
        }
    }

    /** The tracks that match, `SEARCH_PAGE_SIZE` from `offset` on. They are known afterwards. */
    async search(query: string, offset = 0): Promise<SpotifyQueueEntry[]> {
        const params = new URLSearchParams({ q: query, type: "track", limit: String(SEARCH_PAGE_SIZE), offset: String(offset) });
        const { body } = await this.request<{ tracks?: { items: (ApiTrack | null)[] } }>(`/search?${params}`);
        const found = (body?.tracks?.items ?? []).flatMap((track) => (track ? entryOf(track) : []));
        this.add(found);
        return found;
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
                if (waitSec <= MAX_RETRY_WAIT_SEC) {
                    await sleep(waitSec * 1000);
                    return this.request<T>(path, true);
                }
            }
            const where = path.split("?")[0];
            if (status !== undefined) {
                // A track that is gone is not a fault of the connection.
                this.lastOk = status === 404 ? this.lastOk : false;
                AppLogger.warn(undefined, { message: `[Spotify] ${where} answered ${status}` });
                return { gone: status === 404 };
            }
            this.lastOk = false;
            AppLogger.warn(undefined, { message: `[Spotify] ${where} failed`, error });
            return {};
        }
    }
}

export const spotifyCatalog = new SpotifyCatalog(process.env.AUD_SPOTIFY_CLIENT_ID || undefined, process.env.AUD_SPOTIFY_CLIENT_SECRET || undefined);
