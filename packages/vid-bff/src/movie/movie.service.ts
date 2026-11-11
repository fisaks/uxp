import { AppErrorV2, AppLogger, tryReadJsonFile, writeJsonFile } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { MovieCategory, MovieItem, MovieItemUpdate, MovieSubtitle } from "@vid/common";
import path from "path";
import { homeVideoConfig } from "../home-video/home-video.config";
import { MetadataStore } from "../metadata-store";
import { movieConfig } from "./movie.config";
import { ScannedItem, scanCategory } from "./movie-scanner";

const SCAN_CACHE_FILE = "movie-scan.json";

/** The metadata the user has set on an item. `year` null is a year the user cleared. */
type MovieMetadata = { title?: string; year?: number | null };

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

const toItem = (scanned: ScannedItem, metadata: MovieMetadata | undefined): MovieItem => ({
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
});

/** The movies: what the scan finds in the folders of the categories, with the metadata the user has set. */
export class MovieService {
    private scanned = new Map<string, ScannedItem>();
    private readonly store = new MetadataStore<MovieMetadata>("movie", movieConfig.metadataFile);

    async load(): Promise<void> {
        await this.store.load();
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
    }

    flush(): Promise<void> {
        return this.store.flush();
    }

    list(category?: MovieCategory): MovieItem[] {
        return [...this.scanned.values()]
            .filter((item) => !category || item.category === category)
            .map((item) => toItem(item, this.store.getMetadata(`${item.category}/${item.file}`)));
    }

    get(id: string): MovieItem | undefined {
        const item = this.scanned.get(id);
        return item && toItem(item, this.store.getMetadata(`${item.category}/${item.file}`));
    }

    /** The item with the change made. Throws when there is no such item or the change cannot be kept. */
    update(id: string, change: MovieItemUpdate): MovieItem {
        const item = this.scanned.get(id);
        if (!item) {
            throw new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "There is no such item", params: { resource: "item" } });
        }
        if (!this.store.canSave()) {
            throw new AppErrorV2({ statusCode: 503, code: ErrorCodes.INVALID_STATE, message: "The movie metadata cannot be saved right now" });
        }
        this.store.updateMetadata(`${item.category}/${item.file}`, change);
        return toItem(item, this.store.getMetadata(`${item.category}/${item.file}`));
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
