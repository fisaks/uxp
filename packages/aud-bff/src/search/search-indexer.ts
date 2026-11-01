import {
    LibraryAlbum,
    SEARCH_INDEX,
    SearchAlbumDoc,
    SearchArtistDoc,
    SearchBookDoc,
    SearchPlaylistDoc,
    SearchTrackDoc,
} from "@aud/common";
import { AppLogger, SearchIndexSettings, SearchService } from "@uxp/bff-common";
import path from "path";
import { audiobookService, libraryService, LibraryService } from "../library/library.service";
import { playlistService, PlaylistService } from "../playlists/playlist.service";

const SCOPED_KEY_NAME = "aud";
const SCOPED_KEY_INDEXES = "aud_*";
const SCOPED_KEY_ACTIONS = ["search", "documents.*", "indexes.create", "indexes.get", "settings.update", "tasks.get"];
/** A burst of changes (a scan, a playlist being edited) is indexed once. */
const DEBOUNCE_MS = 2_000;

type Kind = keyof typeof SEARCH_INDEX;

// A stop word is left out of the query and of the documents. Matching all words is a setting of the query, made by the search handler.
const base = { stopWords: ["the"] } satisfies SearchIndexSettings;

const SETTINGS: Record<Kind, SearchIndexSettings> = {
    tracks: {
        ...base,
        primaryKey: "id",
        searchableAttributes: ["title", "artist", "album", "composers", "genres", "fileName", "year"],
        filterableAttributes: ["artistId", "albumId", "genres", "year"],
    },
    albums: { ...base, primaryKey: "id", searchableAttributes: ["title", "artist", "year"], filterableAttributes: ["artistId", "year"] },
    artists: { ...base, primaryKey: "id", searchableAttributes: ["name"] },
    books: { ...base, primaryKey: "id", searchableAttributes: ["title", "author"], filterableAttributes: ["authorId"] },
    playlists: { ...base, primaryKey: "id", searchableAttributes: ["name"] },
};

/**
 * Keeps the Meilisearch indexes of AUD equal to the libraries and the playlists, which are the truth: an index is rebuilt in full
 * at the start and again for what has changed. The names of the playlists are indexed, not the tracks in them.
 */
export class SearchIndexer {
    private readonly dirty = new Set<Kind>();
    private timer?: NodeJS.Timeout;
    private running?: Promise<void>;
    private search?: SearchService;

    constructor(
        private readonly music: LibraryService,
        private readonly books: LibraryService,
        private readonly playlists: PlaylistService,
        private readonly env: { url?: string; apiKey?: string; masterKey?: string }
    ) {}

    /** Creates the indexes and fills them. Never throws: without Meilisearch AUD works, only without search. */
    async start() {
        const { url, masterKey } = this.env;
        if (!url) {
            AppLogger.info(undefined, { message: "[Search] MEILI_URL is not set, search is off" });
            return;
        }
        try {
            const apiKey = this.env.apiKey || (masterKey ? await this.devKey(url, masterKey) : undefined);
            this.search = new SearchService({ url, apiKey });
            for (const kind of Object.keys(SEARCH_INDEX) as Kind[]) {
                await this.search.ensureIndex(SEARCH_INDEX[kind], SETTINGS[kind]);
            }
            this.music.on("changed", () => this.markDirty("tracks", "albums", "artists"));
            this.books.on("changed", () => this.markDirty("books"));
            this.playlists.on("changed", () => this.markDirty("playlists"));
            this.markDirty(...(Object.keys(SEARCH_INDEX) as Kind[]));
        } catch (error) {
            AppLogger.error(undefined, { message: "[Search] Could not set up the indexes, search is off", error });
            this.search = undefined;
        }
    }

    /** In the dev environment the BFF holds the master key and makes the key of the app itself. In production it is given the scoped key. */
    private devKey(url: string, masterKey: string): Promise<string> {
        return new SearchService({ url, apiKey: masterKey }).ensureScopedKey({
            name: SCOPED_KEY_NAME,
            description: "AUD: search and index its own indexes",
            indexes: [SCOPED_KEY_INDEXES],
            actions: SCOPED_KEY_ACTIONS,
        });
    }

    private markDirty(...kinds: Kind[]) {
        kinds.forEach((kind) => this.dirty.add(kind));
        clearTimeout(this.timer);
        this.timer = setTimeout(() => void this.flush(), DEBOUNCE_MS);
    }

    /** Indexes what is dirty, one run at a time: a change during a run is picked up by the next. */
    private flush(): Promise<void> {
        this.running ??= this.indexDirty().finally(() => {
            this.running = undefined;
            if (this.dirty.size > 0) {
                this.markDirty();
            }
        });
        return this.running;
    }

    private async indexDirty() {
        const search = this.search;
        const kinds = [...this.dirty];
        this.dirty.clear();
        if (!search) {
            return;
        }
        for (const kind of kinds) {
            try {
                const docs = this.documents(kind);
                await search.replaceDocuments(SEARCH_INDEX[kind], docs);
                AppLogger.info(undefined, { message: `[Search] Indexed ${docs.length} ${kind}` });
            } catch (error) {
                this.dirty.add(kind);
                AppLogger.error(undefined, { message: `[Search] Could not index the ${kind}, trying again at the next change`, error });
            }
        }
    }

    private documents(kind: Kind): object[] {
        switch (kind) {
            case "tracks":
                return this.trackDocs();
            case "albums":
                return this.albumDocs(this.music).map<SearchAlbumDoc>(({ album, artist }) => ({
                    id: album.id,
                    artistId: album.artistId,
                    title: album.title,
                    artist,
                    year: album.year,
                }));
            case "artists":
                return this.music.getArtists().map<SearchArtistDoc>(({ id, name }) => ({ id, name }));
            case "books":
                return this.albumDocs(this.books).map<SearchBookDoc>(({ album, artist }) => ({
                    id: album.id,
                    authorId: album.artistId,
                    title: album.title,
                    author: artist,
                }));
            case "playlists":
                return this.playlists.list().map<SearchPlaylistDoc>(({ id, name }) => ({ id, name }));
        }
    }

    private albumDocs(library: LibraryService): { album: LibraryAlbum; artist: string }[] {
        return library.getAllAlbums().map((album) => ({ album, artist: library.getArtist(album.artistId)?.name ?? "" }));
    }

    private trackDocs(): SearchTrackDoc[] {
        return this.music.getScannedTracks().map((track) => ({
            id: track.id,
            albumId: track.albumId,
            artistId: track.artistId,
            title: track.title,
            artist: track.artist,
            album: this.music.getAlbum(track.albumId)?.title ?? "",
            fileName: path.basename(track.file),
            genres: track.genres ?? [],
            composers: track.composers ?? [],
            year: track.year,
        }));
    }
}

export const searchIndexer = new SearchIndexer(libraryService, audiobookService, playlistService, {
    url: process.env.MEILI_URL || undefined,
    apiKey: process.env.MEILI_API_KEY || undefined,
    masterKey: process.env.MEILI_MASTER_KEY || undefined,
});
