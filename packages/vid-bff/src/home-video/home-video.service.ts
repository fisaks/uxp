import { HomeVideoClip, HomeVideoClipUpdate, HomeVideoLabels } from "@vid/common";
import { AppErrorV2, AppLogger, tryReadJsonFile, writeJsonFile } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { mkdir, readdir, rename, rm, stat, utimes, writeFile } from "fs/promises";
import path from "path";
import { homeVideoConfig, TRASH_FOLDER, TRASH_KEEP_MS, UPLOADS_FOLDER } from "./home-video.config";
import { HomeVideoMetadataStore, HomeVideoMetadata } from "./home-video-metadata-store";
import { homeVideoSearch } from "./home-video-search";
import { clipId, parseDate, probe, ScannedClip, scanFolder } from "./home-video-scanner";
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
    uploadedBy: metadata?.uploadedBy ?? null,
    originalName: metadata?.originalName ?? null,
    uploadedAt: metadata?.uploadedAt ?? null,
});

/** The home videos: what the scan finds in the home video folder, with the metadata the user has set. */
export class HomeVideoService {
    private scanned = new Map<string, ScannedClip>();
    private readonly store = new HomeVideoMetadataStore(homeVideoConfig.metadataFile);
    readonly search = homeVideoSearch(() => this.list());
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
            await this.purgeTrash(folder);
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

    /** The clip with the change made. Throws when there is no such clip or the change cannot be kept. */
    update(id: string, change: HomeVideoClipUpdate): HomeVideoClip {
        const clip = this.scanned.get(id);
        if (!clip) {
            throw new AppErrorV2({code: ErrorCodes.NOT_FOUND, message: "There is no such clip", params: { resource: "clip" } });
        }
        if (!this.store.canSave()) {
            throw new AppErrorV2({code: ErrorCodes.NOT_READY, message: "The home video metadata cannot be saved right now" });
        }
        this.store.updateMetadata(clip.file, change);
        this.search.reindex();
        return toClip(clip, this.store.getMetadata(clip.file));
    }

    /**
     * Adds a file that is already in the home video folder as a clip, without scanning the folder again. The file must be where it stays: the
     * clip id is made from its path. `date` is only kept when it is given (null is a clip with no date).
     */
    async addClip(file: string, upload: { uploadedBy: string; originalName?: string }, date: string | null | undefined): Promise<HomeVideoClip> {
        const folder = this.folderOrThrow();
        const full = path.join(folder, file);
        const { size, mtimeMs } = await stat(full);
        const { durationSeconds, width, height } = await probe(full);
        const scanned: ScannedClip = { id: clipId(file), file, durationSeconds, width, height, sizeBytes: size, mtimeMs, parsedDate: parseDate(file) };
        this.scanned.set(scanned.id, scanned);
        this.store.updateMetadata(file, { ...upload, uploadedAt: new Date().toISOString(), ...(date !== undefined && { date }) });
        this.search.reindex();
        return toClip(scanned, this.store.getMetadata(file));
    }

    /** Whether the metadata can be saved, which a new clip needs: it keeps who uploaded the clip. */
    canSave(): boolean {
        return this.store.canSave();
    }

    /**
     * Deletes an uploaded clip: the file goes to the trash for a while, with its metadata beside it, so a mistake can be undone by hand.
     * Only clips that were uploaded can be deleted. The clip is taken out of the playlists. A Chromecast queue that still has it skips it,
     * as a clip that is gone cannot be found.
     */
    async remove(id: string): Promise<void> {
        const clip = this.scanned.get(id);
        if (!clip) {
            throw new AppErrorV2({ code: ErrorCodes.NOT_FOUND, message: "There is no such clip", params: { resource: "clip" } });
        }
        const metadata = this.store.getMetadata(clip.file);
        if (!metadata?.uploadedBy || !clip.file.startsWith(`${UPLOADS_FOLDER}/`)) {
            throw new AppErrorV2({ code: ErrorCodes.FORBIDDEN, message: "Only an uploaded clip can be deleted" });
        }
        if (!this.store.canSave()) {
            throw new AppErrorV2({ code: ErrorCodes.NOT_READY, message: "The home video metadata cannot be saved right now" });
        }
        const folder = this.folderOrThrow();
        const trash = path.join(folder, TRASH_FOLDER);
        const name = path.basename(clip.file);
        await mkdir(trash, { recursive: true });
        await writeFile(path.join(trash, `${name}.json`), JSON.stringify({ file: clip.file, metadata }));
        await rename(path.join(folder, clip.file), path.join(trash, name));
        // The time in the trash counts from now, not from when the file was written.
        const now = new Date();
        await utimes(path.join(trash, name), now, now);
        this.scanned.delete(id);
        this.store.deleteMetadata(clip.file);
        await this.thumbnails.remove(id);
        this.search.reindex();
    }

    /** Removes what has been in the trash for longer than it is kept. */
    private async purgeTrash(folder: string): Promise<void> {
        const trash = path.join(folder, TRASH_FOLDER);
        try {
            for (const name of (await readdir(trash)).filter((entry) => entry.endsWith(".mp4"))) {
                if (Date.now() - (await stat(path.join(trash, name))).mtimeMs > TRASH_KEEP_MS) {
                    AppLogger.info(undefined, { message: `[Trash] Removing ${name}, it has been there for over 30 days` });
                    await rm(path.join(trash, name), { force: true });
                    await rm(path.join(trash, `${name}.json`), { force: true });
                }
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                AppLogger.warn(undefined, { message: "[Trash] Could not purge the trash", error });
            }
        }
    }

    private folderOrThrow(): string {
        if (!homeVideoConfig.folder) {
            throw new AppErrorV2({ code: ErrorCodes.SERVICE_NOT_CONFIGURED, message: "The home video folder is not set up: VID_MEDIA_ROOT is missing" });
        }
        return homeVideoConfig.folder;
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
