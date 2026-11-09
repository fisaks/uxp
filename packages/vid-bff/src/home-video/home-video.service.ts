import { HomeVideoClip, HomeVideoClipUpdate, HomeVideoLabels } from "@vid/common";
import { AppLogger, tryReadJsonFile, writeJsonFile } from "@uxp/bff-common";
import path from "path";
import { homeVideoConfig } from "./home-video.config";
import { HomeVideoMetadataStore, HomeVideoMetadata } from "./home-video-metadata-store";
import { HomeVideoSearch } from "./home-video-search";
import { ScannedClip, scanFolder } from "./home-video-scanner";
import { HomeVideoThumbnails } from "./home-video-thumbnails";

const SCAN_CACHE_FILE = "home-video-scan.json";

const labelsByUse = (lists: string[][]): string[] => {
    const counts = new Map<string, number>();
    for (const label of lists.flat()) {
        counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([label]) => label);
};

const toClip = (scanned: ScannedClip, metadata: HomeVideoMetadata | undefined): HomeVideoClip => ({
    id: scanned.id,
    file: scanned.file,
    durationSeconds: scanned.durationSeconds,
    width: scanned.width,
    height: scanned.height,
    sizeBytes: scanned.sizeBytes,
    date: metadata?.date !== undefined ? metadata.date : scanned.parsedDate,
    title: metadata?.title ?? "",
    description: metadata?.description ?? "",
    people: metadata?.people ?? [],
    tags: metadata?.tags ?? [],
});

/** The home videos: what the scan finds in the home video folder, with the metadata the user has set. */
export class HomeVideoService {
    private scanned = new Map<string, ScannedClip>();
    private readonly store = new HomeVideoMetadataStore(homeVideoConfig.metadataFile);
    readonly search = new HomeVideoSearch(() => this.list(), {
        url: process.env.MEILI_URL || undefined,
        apiKey: process.env.MEILI_API_KEY || undefined,
        masterKey: process.env.MEILI_MASTER_KEY || undefined,
    });
    private readonly thumbnails = new HomeVideoThumbnails(path.join(homeVideoConfig.cacheDir, "home-video-thumbs"));

    async load(): Promise<void> {
        await this.store.load();
        await this.search.start();
        const folder = homeVideoConfig.folder;
        if (!folder) {
            AppLogger.info(undefined, { message: "VID_MEDIA_ROOT is not set, the home video library is empty" });
            return;
        }
        const cacheFile = path.join(homeVideoConfig.cacheDir, SCAN_CACHE_FILE);
        const cached = (await tryReadJsonFile<ScannedClip[]>(cacheFile)) ?? [];
        try {
            const clips = await scanFolder(folder, new Map(cached.map((clip) => [clip.file, clip])));
            this.scanned = new Map(clips.map((clip) => [clip.id, clip]));
            // An empty scan is not saved: the drive may just not be there, and the cache is then still good.
            if (clips.length > 0) {
                await writeJsonFile(cacheFile, clips, true);
            }
            AppLogger.info(undefined, { message: `Home videos: ${clips.length} clips` });
            this.search.reindex();
        } catch (error) {
            AppLogger.warn(undefined, { message: "Could not scan the home video folder", error });
        }
    }

    flush(): Promise<void> {
        return this.store.flush();
    }

    list(): HomeVideoClip[] {
        return [...this.scanned.values()].map((clip) => toClip(clip, this.store.getMetadata(clip.file)));
    }

    get(id: string): HomeVideoClip | undefined {
        const clip = this.scanned.get(id);
        return clip && toClip(clip, this.store.getMetadata(clip.file));
    }

    /** The clip with the change made, undefined when there is no such clip. Throws when the change cannot be kept. */
    update(id: string, change: HomeVideoClipUpdate): HomeVideoClip | undefined {
        const clip = this.scanned.get(id);
        if (!clip) {
            return undefined;
        }
        if (!this.store.canSave()) {
            throw new Error("The home video metadata cannot be saved");
        }
        this.store.updateMetadata(clip.file, change);
        this.search.reindex();
        return this.get(id);
    }

    labels(): HomeVideoLabels {
        const metadata = this.store.allMetadata();
        return {
            people: labelsByUse(metadata.map((entry) => entry.people ?? [])),
            tags: labelsByUse(metadata.map((entry) => entry.tags ?? [])),
        };
    }

    /** The file of the clip on disk, undefined when there is no such clip. */
    filePath(id: string): string | undefined {
        const clip = this.scanned.get(id);
        return clip && homeVideoConfig.folder ? path.join(homeVideoConfig.folder, clip.file) : undefined;
    }

    /** The path of the poster frame of the clip, undefined when there is no such clip. */
    thumbnail(id: string): Promise<string> | undefined {
        const clip = this.scanned.get(id);
        return clip && homeVideoConfig.folder
            ? this.thumbnails.get(id, path.join(homeVideoConfig.folder, clip.file), clip.durationSeconds)
            : undefined;
    }
}

export const homeVideoService = new HomeVideoService();
