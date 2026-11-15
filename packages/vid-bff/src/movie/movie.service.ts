import { AppErrorV2, AppLogger, tryReadJsonFile, writeJsonFile } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { MovieCategory, MovieItem, MovieItemUpdate, MovieMatchCandidate, MovieSubtitle } from "@vid/common";
import { readdir } from "fs/promises";
import path from "path";
import { homeVideoConfig } from "../home-video/home-video.config";
import { MetadataStore } from "../metadata-store";
import { movieConfig } from "./movie.config";
import { pickMatch } from "./movie-matcher";
import { movieSearch } from "./movie-search";
import { ScannedItem, scanCategory } from "./movie-scanner";
import { posterFileName, TmdbEntry, tmdbClient, TmdbKind } from "./tmdb-client";

const SCAN_CACHE_FILE = "movie-scan.json";

/** The metadata the user has set on an item. `year` null is a year the user cleared. */
type MovieMetadata = { title?: string; year?: number | null };

/**
 * The TMDB entry of a film or a series. A null `tmdbId` is a "no match" the user has chosen, which is not looked up again.
 * The fields are those of the entry at the time it was matched.
 */
type MovieMatch = {
    tmdbId: number | null;
    /** Where the entry is. Missing in matches made before TV entries for films existed: then it is `kindOf` the item. */
    kind?: TmdbKind;
    overview: string | null;
    rating: number | null;
    posterFile: string | null;
};

/** Pause between two TMDB calls, as TMDB asks for a modest rate. */
const TMDB_PAUSE_MS = 300;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const kindOf = (item: ScannedItem): TmdbKind => (item.kind === "episode" ? "tv" : "movie");

/** The TMDB list of the match of an item. */
const matchKind = (item: ScannedItem, match: MovieMatch | undefined): TmdbKind => match?.kind ?? kindOf(item);

/** An episode has the match of its series, so all its episodes share one entry. */
const matchKey = (item: ScannedItem): string => (item.kind === "episode" ? `series:${item.series}` : `movie:${item.category}/${item.file}`);

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

/** The language in a name like `Film.en.vtt`, or null when the name has none (`Film.vtt`, `Film.2.vtt`). */
const languageOf = (file: string, videoFile: string): string | null => {
    const stem = videoFile.slice(0, videoFile.length - path.extname(videoFile).length);
    const code = file.slice(stem.length + 1, file.length - ".vtt".length);
    if (!code || /^\d+$/.test(code)) {
        return null;
    }
    try {
        return languageNames.of(code) ? code : null;
    } catch {
        return null;
    }
};

const subtitlesOf = (scanned: ScannedItem): MovieSubtitle[] => {
    const unlabelled = scanned.subtitleFiles.filter((file) => languageOf(file, scanned.file) === null).length;
    let numbered = 0;
    return scanned.subtitleFiles.map((file, index) => {
        const language = languageOf(file, scanned.file);
        if (language) {
            return { index, label: languageNames.of(language) ?? language, language };
        }
        numbered++;
        return { index, label: unlabelled > 1 ? `Subtitles ${numbered}` : "Subtitles", language: null };
    });
};

const toItem = (
    scanned: ScannedItem,
    metadata: MovieMetadata | undefined,
    match: MovieMatch | undefined,
    posters: Set<string>
): MovieItem => ({
    id: scanned.id,
    category: scanned.category,
    kind: scanned.kind,
    title: metadata?.title ?? scanned.title,
    year: metadata?.year !== undefined ? metadata.year : scanned.year,
    series: scanned.series,
    season: scanned.season,
    episode: scanned.episode,
    file: scanned.file,
    durationSeconds: scanned.durationSeconds,
    width: scanned.width,
    height: scanned.height,
    sizeBytes: scanned.sizeBytes,
    subtitles: subtitlesOf(scanned),
    tmdbId: match?.tmdbId ?? null,
    tmdbKind: match?.tmdbId != null ? matchKind(scanned, match) : null,
    overview: match?.overview ?? null,
    rating: match?.rating ?? null,
    hasPoster: match?.posterFile != null && posters.has(match.posterFile),
});

/** The movies: what the scan finds in the folders of the categories, with the metadata the user has set. */
export class MovieService {
    private scanned = new Map<string, ScannedItem>();
    private readonly store = new MetadataStore<MovieMetadata>("movie", movieConfig.metadataFile);
    private readonly matches = new MetadataStore<MovieMatch>("movie match", movieConfig.matchFile);
    /** The poster files that are in the posters folder. */
    private posters = new Set<string>();
    readonly search = movieSearch(() => this.list());

    async load(): Promise<void> {
        await this.store.load();
        await this.search.start();
        await this.matches.load();
        this.posters = new Set(await readdir(movieConfig.postersDir).catch(() => []));
        if (!movieConfig.metadataFile) {
            AppLogger.info(undefined, { message: "VID_MEDIA_ROOT is not set, the movies are empty" });
            return;
        }
        const cacheFile = path.join(homeVideoConfig.cacheDir, SCAN_CACHE_FILE);
        const cached = (await tryReadJsonFile<ScannedItem[]>(cacheFile)) ?? [];
        const previous = new Map(cached.map((item) => [`${item.category}/${item.file}`, item]));
        const items: ScannedItem[] = [];
        for (const category of movieConfig.categories) {
            const folder = movieConfig.folder(category);
            try {
                items.push(...(await scanCategory(category, folder as string, previous)));
            } catch (error) {
                AppLogger.warn(undefined, { message: `Could not scan the ${category} folder`, error });
            }
        }
        this.scanned = new Map(items.map((item) => [item.id, item]));
        // An empty scan is not saved: the drive may just not be there, and the cache is then still good.
        if (items.length > 0) {
            await writeJsonFile(cacheFile, items, true);
        }
        AppLogger.info(undefined, { message: `Movies: ${items.length} items` });
        this.search.reindex();
        void this.matchAll();
    }

    flush(): Promise<void> {
        return Promise.all([this.store.flush(), this.matches.flush()]).then(() => undefined);
    }

    /**
     * Looks up in TMDB every film and series that has no entry yet, and fetches the posters that are missing. What is already matched
     * is not looked up again. An entry that was not found is tried again at the next load.
     */
    private async matchAll(): Promise<void> {
        if (!tmdbClient.available() || !this.matches.canSave()) {
            AppLogger.info(undefined, { message: "TMDB matching is off: VID_TMDB_TOKEN is not set or the match file cannot be saved" });
            return;
        }
        // One item per match key: the episodes of a series share a key, and the series is looked up once, not once per episode.
        const wanted = new Map<string, ScannedItem>();
        for (const item of this.scanned.values()) {
            const key = matchKey(item);
            if (!wanted.has(key)) {
                wanted.set(key, item);
            }
        }
        let found = 0;
        let notFound = 0;
        for (const [key, item] of wanted) {
            const match = this.matches.getMetadata(key);
            try {
                if (match === undefined) {
                    await sleep(TMDB_PAUSE_MS);
                    const entry = await this.findEntry(item);
                    if (entry) {
                        await this.keepMatch(key, entry.kind, entry.entry);
                        found++;
                    } else {
                        notFound++;
                    }
                } else if (match.tmdbId !== null && match.posterFile && !this.posters.has(match.posterFile)) {
                    await sleep(TMDB_PAUSE_MS);
                    await this.fetchPoster(matchKind(item, match), match.tmdbId, match.posterFile);
                }
            } catch (error) {
                // TMDB cannot be reached or refuses the token: the rest would fail the same way, so the next load tries again.
                AppLogger.warn(undefined, { message: "TMDB lookup failed, matching stops until the next load", error });
                return;
            }
        }
        AppLogger.info(undefined, { message: `TMDB: ${found} matched, ${notFound} not found` });
        // The overviews are searched too.
        this.search.reindex();
    }

    /** The entry that surely is the item, and where it is. A film that TMDB does not list as a film may be a TV film or a miniseries there. */
    private async findEntry(item: ScannedItem): Promise<{ kind: TmdbKind; entry: TmdbEntry } | undefined> {
        const metadata = this.store.getMetadata(`${item.category}/${item.file}`);
        const title = item.kind === "episode" ? (item.series as string) : (metadata?.title ?? item.title);
        const year = item.kind === "episode" ? null : metadata?.year !== undefined ? metadata.year : item.year;
        const kinds: TmdbKind[] = item.kind === "episode" ? ["tv"] : ["movie", "tv"];
        for (const kind of kinds) {
            const entry = pickMatch(await tmdbClient.search(kind, title), title, year);
            if (entry) {
                return { kind, entry };
            }
        }
        return undefined;
    }

    private async keepMatch(key: string, kind: TmdbKind, entry: TmdbEntry): Promise<void> {
        const posterFile = entry.posterPath ? posterFileName(kind, entry.id) : null;
        this.matches.updateMetadata(key, { tmdbId: entry.id, kind, overview: entry.overview, rating: entry.rating, posterFile });
        if (posterFile) {
            await this.fetchPoster(kind, entry.id, posterFile, entry);
        }
    }

    private async fetchPoster(kind: TmdbKind, id: number, posterFile: string, known?: TmdbEntry): Promise<void> {
        const entry = known ?? (await tmdbClient.get(kind, id));
        if (await tmdbClient.downloadPoster(kind, entry)) {
            this.posters.add(posterFile);
        }
    }

    /** The TMDB entries for a text, for the user to pick the right one for an item. */
    async searchEntries(id: string, query: string): Promise<MovieMatchCandidate[]> {
        const item = this.requireItem(id);
        if (!tmdbClient.available()) {
            throw new AppErrorV2({ code: ErrorCodes.SERVICE_NOT_CONFIGURED, message: "TMDB is not set up" });
        }
        // A film is looked for among the films first, then among the series, where TV films and miniseries are.
        const kinds: TmdbKind[] = item.kind === "episode" ? ["tv"] : ["movie", "tv"];
        const limit = kinds.length === 1 ? 10 : 6;
        const found = await this.callTmdb(async () => {
            const lists = await Promise.all(
                kinds.map(async (kind) => (await tmdbClient.search(kind, query)).slice(0, limit).map((entry) => ({ kind, entry })))
            );
            return lists.flat();
        });
        return found.map(({ kind, entry }) => ({
            tmdbId: entry.id,
            kind,
            title: entry.title,
            year: entry.year,
            overview: entry.overview,
            posterPath: entry.posterPath,
        }));
    }

    /** Sets the TMDB entry of the item (of its series for an episode), or says there is none with a null id. */
    async setMatch(id: string, tmdbId: number | null, kind?: TmdbKind): Promise<MovieItem> {
        const item = this.requireItem(id);
        if (!this.matches.canSave()) {
            throw new AppErrorV2({ code: ErrorCodes.NOT_READY, message: "The movie matches cannot be saved right now" });
        }
        const key = matchKey(item);
        if (tmdbId === null) {
            this.matches.updateMetadata(key, { tmdbId: null, kind: undefined, overview: null, rating: null, posterFile: null });
        } else {
            if (!tmdbClient.available()) {
                throw new AppErrorV2({ code: ErrorCodes.SERVICE_NOT_CONFIGURED, message: "TMDB is not set up" });
            }
            // An episode has the series of its series; a film is where the user picked it, or where it was.
            const where = item.kind === "episode" ? "tv" : (kind ?? matchKind(item, this.matches.getMetadata(key)));
            const entry = await this.callTmdb(() => tmdbClient.get(where, tmdbId));
            await this.callTmdb(() => this.keepMatch(key, where, entry));
        }
        this.search.reindex();
        return this.toMovieItem(item);
    }

    private async callTmdb<T>(call: () => Promise<T>): Promise<T> {
        try {
            return await call();
        } catch (error) {
            AppLogger.warn(undefined, { message: "TMDB call failed", error });
            throw new AppErrorV2({ code: ErrorCodes.UNREACHABLE, message: "TMDB could not be reached" });
        }
    }

    private requireItem(id: string): ScannedItem {
        const item = this.scanned.get(id);
        if (!item) {
            throw new AppErrorV2({ code: ErrorCodes.NOT_FOUND, message: "There is no such item", params: { resource: "item" } });
        }
        return item;
    }

    private toMovieItem(item: ScannedItem): MovieItem {
        return toItem(
            item,
            this.store.getMetadata(`${item.category}/${item.file}`),
            this.matches.getMetadata(matchKey(item)),
            this.posters
        );
    }

    /** The poster file of the item, undefined when it has none. */
    posterPath(id: string): string | undefined {
        const item = this.scanned.get(id);
        const file = item && this.matches.getMetadata(matchKey(item))?.posterFile;
        return file && this.posters.has(file) ? path.join(movieConfig.postersDir, file) : undefined;
    }

    list(category?: MovieCategory): MovieItem[] {
        return [...this.scanned.values()].filter((item) => !category || item.category === category).map((item) => this.toMovieItem(item));
    }

    get(id: string): MovieItem | undefined {
        const item = this.scanned.get(id);
        return item && this.toMovieItem(item);
    }

    /** The item with the change made. Throws when there is no such item or the change cannot be kept. */
    update(id: string, change: MovieItemUpdate): MovieItem {
        const item = this.requireItem(id);
        if (!this.store.canSave()) {
            throw new AppErrorV2({ code: ErrorCodes.NOT_READY, message: "The movie metadata cannot be saved right now" });
        }
        this.store.updateMetadata(`${item.category}/${item.file}`, change);
        this.search.reindex();
        return this.toMovieItem(item);
    }

    /** The file of the item on disk, undefined when there is no such item. */
    filePath(id: string): string | undefined {
        const item = this.scanned.get(id);
        const folder = item && movieConfig.folder(item.category);
        return item && folder ? path.join(folder, item.file) : undefined;
    }

    /** The subtitle file with the number, undefined when the item has no such one. */
    subtitlePath(id: string, index: number): string | undefined {
        const item = this.scanned.get(id);
        const folder = item && movieConfig.folder(item.category);
        const file = item?.subtitleFiles[index];
        return folder && file ? path.join(folder, file) : undefined;
    }
}

export const movieService = new MovieService();
