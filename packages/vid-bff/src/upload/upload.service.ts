import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { UPLOAD_CHUNK_BYTES, UPLOAD_MAX_FILE_BYTES, UploadCreateRequest, UploadSession, UploadState, UploadStatus } from "@vid/common";
import { randomBytes } from "crypto";
import { createWriteStream } from "fs";
import { mkdir, readdir, readFile, rename, rm, stat, statfs, writeFile } from "fs/promises";
import path from "path";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import { homeVideoConfig, UPLOADS_FOLDER } from "../home-video/home-video.config";
import { homeVideoService } from "../home-video/home-video.service";
import { filmedDate, makeMp4, probeUpload } from "./upload-converter";
import { VideoServerWebSocketManager } from "../ws/VideoServerWebSocketManager";
import { CLEANUP_INTERVAL_MS, MAX_SESSIONS_PER_USER, STALE_UPLOAD_MS, UPLOAD_FREE_SPACE_FACTOR, uploadConfig } from "./upload.config";

/** What is kept about an upload beside its bytes. The owner comes from the token, never from the client. */
type UploadMeta = {
    id: string;
    owner: string;
    ownerUuid: string;
    sizeBytes: number;
    originalName?: string;
    /** The date asked for when the upload was made. Absent means the server takes it from the file. */
    date?: string | null;
    createdAt: string;
};

/** What became of an upload that was finished. It is kept in memory, the files are gone by then. */
type Job = { owner: string; ownerUuid: string; sizeBytes: number; state: UploadState; percent?: number; clipId?: string; errorCode?: string; finishedAt?: number };

/** How long the result of a finished upload can be asked for: 24 hours (86 400 s, 86 400 000 ms). */
const JOB_KEEP_MS = 24 * 60 * 60 * 1000;

/** The file a conversion writes, which is not `.mp4` so nothing takes it for a clip before it is moved into place. */
const OUTPUT_EXTENSION = ".out";

/** How often the progress of a conversion is pushed at most: 2 s (2 000 ms). */
const PROGRESS_PUSH_MS = 2000;

const notFound = () => new AppErrorV2({ code: ErrorCodes.NOT_FOUND, message: "There is no such upload", params: { resource: "upload" } });

/** Stops a chunk that is larger than it may be, so a client cannot write more than it announced. */
const limitBytes = (max: number) => {
    let seen = 0;
    return new Transform({
        transform(chunk: Buffer, _encoding, callback) {
            seen += chunk.length;
            if (seen > max) {
                callback(new AppErrorV2({ code: ErrorCodes.FILE_TOO_LARGE, message: "The chunk is larger than the upload allows" }));
                return;
            }
            callback(null, chunk);
        },
    });
};

/**
 * Resumable uploads. An upload is a `<id>.part` file and a `<id>.json` with its owner and size. The size of the part file is
 * the offset, so what the server says is always what is on the disk, also after a restart or a broken request.
 */
export class UploadService {
    constructor(private readonly wsManager: VideoServerWebSocketManager) {}

    /** Uploads that are being written to right now, so two requests cannot append to one file. */
    private readonly writing = new Set<string>();
    private timer?: NodeJS.Timeout;
    /** Uploads that are finished: waiting for their turn, being made ready, done or failed. */
    private readonly jobs = new Map<string, Job>();
    /** Conversions run one at a time, as a conversion uses all the processors it can get. */
    private queue: Promise<void> = Promise.resolve();
    /** The ids of the uploads that wait for their turn, the next one first. */
    private readonly waiting: string[] = [];

    async start(): Promise<void> {
        if (!uploadConfig.folder) {
            AppLogger.info(undefined, { message: "VID_MEDIA_ROOT is not set, uploads are off" });
            return;
        }
        await mkdir(uploadConfig.folder, { recursive: true });
        // Nothing is being converted just after a start, so a file of a conversion is left from one that was cut off.
        for (const name of (await readdir(uploadConfig.folder)).filter((entry) => entry.endsWith(OUTPUT_EXTENSION))) {
            await rm(path.join(uploadConfig.folder, name), { force: true });
        }
        await this.removeStale();
        // An upload that was complete when the server stopped has nobody to start it: take it in hand again.
        for (const meta of await this.allMeta()) {
            if ((await this.offsetOf(meta.id).catch(() => 0)) >= meta.sizeBytes) {
                this.startProcessing(meta);
            }
        }
        this.timer = setInterval(() => void this.removeStale(), CLEANUP_INTERVAL_MS);
        this.timer.unref();
    }

    async status(): Promise<UploadStatus> {
        const freeBytes = await this.freeBytes();
        return {
            enabled: uploadConfig.folder !== undefined && freeBytes >= UPLOAD_MAX_FILE_BYTES * UPLOAD_FREE_SPACE_FACTOR,
            maxFileBytes: UPLOAD_MAX_FILE_BYTES,
            chunkBytes: UPLOAD_CHUNK_BYTES,
            freeBytes,
        };
    }

    async create(owner: string, ownerUuid: string, request: UploadCreateRequest): Promise<UploadSession> {
        const folder = this.folder();
        if (request.sizeBytes > UPLOAD_MAX_FILE_BYTES) {
            throw new AppErrorV2({ code: ErrorCodes.FILE_TOO_LARGE, message: "The file is larger than the upload allows", params: { maxBytes: UPLOAD_MAX_FILE_BYTES } });
        }
        if (!(await this.status()).enabled) {
            throw new AppErrorV2({ code: ErrorCodes.NOT_READY, message: "There is not enough free space for an upload" });
        }
        const open = (await this.allMeta()).filter((meta) => meta.owner === owner);
        if (open.length >= MAX_SESSIONS_PER_USER) {
            throw new AppErrorV2({ code: ErrorCodes.SYSTEM_BUSY, message: "There are too many uploads open", params: { max: MAX_SESSIONS_PER_USER } });
        }
        const meta: UploadMeta = {
            id: randomBytes(8).toString("hex"),
            owner,
            ownerUuid,
            sizeBytes: request.sizeBytes,
            originalName: request.originalName,
            date: request.date,
            createdAt: new Date().toISOString(),
        };
        await writeFile(this.partFile(folder, meta.id), "");
        await writeFile(this.metaFile(folder, meta.id), JSON.stringify(meta));
        return this.session(meta, 0);
    }

    /** Where the upload is. The client asks this to resume after a break, and to see how a finished upload is going. */
    async get(owner: string, id: string): Promise<UploadSession> {
        const job = this.ownedJob(owner, id);
        if (job) {
            return this.jobSession(id, job);
        }
        const meta = await this.ownedMeta(owner, id);
        return this.session(meta, await this.offsetOf(meta.id));
    }

    /** Writes the chunk at the offset. The offset must be the one the server has, so a repeated or skipped chunk is refused. */
    async append(owner: string, id: string, offset: number, body: Readable): Promise<UploadSession> {
        const meta = await this.ownedMeta(owner, id);
        if (this.writing.has(id)) {
            throw new AppErrorV2({ code: ErrorCodes.CONFLICT, message: "The upload is being written to" });
        }
        this.writing.add(id);
        try {
            const current = await this.offsetOf(id);
            if (offset !== current) {
                throw new AppErrorV2({ code: ErrorCodes.CONFLICT, message: "The offset is not where the upload is", params: { offset: current } });
            }
            const room = Math.min(UPLOAD_CHUNK_BYTES, meta.sizeBytes - current);
            try {
                await pipeline(body, limitBytes(room), createWriteStream(this.partFile(this.folder(), id), { flags: "a" }));
            } catch (error) {
                // A broken request keeps what was written: the client asks for the offset and goes on from there.
                if (error instanceof AppErrorV2) {
                    throw error;
                }
                AppLogger.warn(undefined, { message: `[Upload] The chunk of ${id} was not completed`, error });
                throw new AppErrorV2({ code: ErrorCodes.INTERNAL_SERVER_ERROR, message: "The chunk could not be written" });
            }
            const written = await this.offsetOf(id);
            if (written >= meta.sizeBytes) {
                if (!homeVideoService.canSave()) {
                    throw new AppErrorV2({ code: ErrorCodes.NOT_READY, message: "The home video metadata cannot be saved right now" });
                }
                return this.jobSession(id, this.startProcessing(meta));
            }
            return this.session(meta, written);
        } finally {
            this.writing.delete(id);
        }
    }

    /** Takes the clip in hand when all its bytes are here: it is checked and made ready one conversion at a time. */
    private startProcessing(meta: UploadMeta): Job {
        const job: Job = { owner: meta.owner, ownerUuid: meta.ownerUuid, sizeBytes: meta.sizeBytes, state: "queued" };
        this.jobs.set(meta.id, job);
        this.waiting.push(meta.id);
        this.queue = this.queue.then(() => this.process(meta, job));
        return job;
    }

    async abort(owner: string, id: string): Promise<void> {
        const state = this.ownedJob(owner, id)?.state;
        if (state === "queued" || state === "processing") {
            throw new AppErrorV2({ code: ErrorCodes.CONFLICT, message: "The upload is being made ready" });
        }
        const meta = await this.ownedMeta(owner, id);
        if (this.writing.has(id)) {
            throw new AppErrorV2({ code: ErrorCodes.CONFLICT, message: "The upload is being written to" });
        }
        await this.remove(meta.id);
    }

    private session(meta: UploadMeta, offset: number): UploadSession {
        return { id: meta.id, sizeBytes: meta.sizeBytes, offset, complete: offset >= meta.sizeBytes, state: "uploading" };
    }

    private jobSession(id: string, job: Job): UploadSession {
        const position = this.waiting.indexOf(id) + 1;
        return {
            id,
            sizeBytes: job.sizeBytes,
            offset: job.sizeBytes,
            complete: true,
            state: job.state,
            queuePosition: job.state === "queued" && position > 0 ? position : undefined,
            percent: job.state === "processing" ? job.percent : undefined,
            clipId: job.clipId,
            errorCode: job.errorCode,
        };
    }

    private ownedJob(owner: string, id: string): Job | undefined {
        const job = this.jobs.get(id);
        if (job && job.owner !== owner) {
            throw notFound();
        }
        return job;
    }

    /** Checks the file, makes the MP4, puts it in place and adds the clip. On a failure the upload is removed: the same file would fail again. */
    private async process(meta: UploadMeta, job: Job): Promise<void> {
        this.waiting.splice(this.waiting.indexOf(meta.id), 1);
        job.state = "processing";
        this.push(meta.id, job);
        // The ones behind this one have moved up.
        for (const id of this.waiting) {
            const other = this.jobs.get(id);
            if (other) this.push(id, other);
        }
        const folder = this.folder();
        const part = this.partFile(folder, meta.id);
        const output = path.join(folder, `${meta.id}${OUTPUT_EXTENSION}`);
        try {
            const info = await probeUpload(part);
            const date = meta.date !== undefined ? meta.date : filmedDate(info);
            let lastPush = 0;
            const converted = await makeMp4(part, output, info, (percent) => {
                if (percent !== job.percent && Date.now() - lastPush >= PROGRESS_PUSH_MS) {
                    lastPush = Date.now();
                    job.percent = percent;
                    this.push(meta.id, job);
                }
            });
            const file = `${UPLOADS_FOLDER}/${meta.id}.mp4`;
            const target = path.join(homeVideoConfig.folder ?? "", file);
            await mkdir(path.dirname(target), { recursive: true });
            await rename(output, target);
            const clip = await homeVideoService.addClip(file, { uploadedBy: meta.owner, originalName: meta.originalName }, date);
            job.clipId = clip.id;
            job.state = "done";
            AppLogger.info(undefined, { message: `[Upload] ${meta.id} is the clip ${clip.id}${converted ? " (converted)" : ""}` });
        } catch (error) {
            job.state = "failed";
            job.errorCode = error instanceof AppErrorV2 ? error.code : ErrorCodes.INTERNAL_SERVER_ERROR;
            AppLogger.warn(undefined, { message: `[Upload] ${meta.id} failed`, error });
            await rm(output, { force: true });
        }
        job.finishedAt = Date.now();
        await this.remove(meta.id);
        this.push(meta.id, job);
    }

    /** Tells the uploader, and nobody else, where the upload is. */
    private push(id: string, job: Job): void {
        this.wsManager.broadcastToUsers([job.ownerUuid], { action: "upload_state", success: true, payload: this.jobSession(id, job) });
    }

    private folder(): string {
        if (!uploadConfig.folder) {
            throw new AppErrorV2({ code: ErrorCodes.SERVICE_NOT_CONFIGURED, message: "Uploads are not set up: VID_MEDIA_ROOT is missing" });
        }
        return uploadConfig.folder;
    }

    private partFile = (folder: string, id: string) => path.join(folder, `${id}.part`);
    private metaFile = (folder: string, id: string) => path.join(folder, `${id}.json`);

    private async offsetOf(id: string): Promise<number> {
        return (await stat(this.partFile(this.folder(), id))).size;
    }

    /** A user sees only their own uploads: another user's id answers as if it did not exist. */
    private async ownedMeta(owner: string, id: string): Promise<UploadMeta> {
        const meta = await this.readMeta(id);
        if (!meta || meta.owner !== owner) {
            throw notFound();
        }
        return meta;
    }

    private async readMeta(id: string): Promise<UploadMeta | undefined> {
        try {
            return JSON.parse(await readFile(this.metaFile(this.folder(), id), "utf8")) as UploadMeta;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                return undefined;
            }
            throw error;
        }
    }

    private async allMeta(): Promise<UploadMeta[]> {
        const folder = this.folder();
        const ids = (await readdir(folder)).filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -".json".length));
        const metas = await Promise.all(ids.map((id) => this.readMeta(id)));
        return metas.filter((meta): meta is UploadMeta => meta !== undefined);
    }

    private async remove(id: string): Promise<void> {
        const folder = this.folder();
        await rm(this.partFile(folder, id), { force: true });
        await rm(this.metaFile(folder, id), { force: true });
    }

    private async freeBytes(): Promise<number> {
        const folder = uploadConfig.folder;
        if (!folder) {
            return 0;
        }
        try {
            const fs = await statfs(folder);
            return fs.bavail * fs.bsize;
        } catch {
            return 0;
        }
    }

    /**
     * Removes the uploads nobody has written to for a long time. The write time of the part file is the last sign of life. A part file
     * without its `.json` is left from a crash while the upload was made, and goes the same way once it is old, which also keeps one
     * that is being made right now.
     */
    private async removeStale(): Promise<void> {
        for (const [id, job] of this.jobs) {
            if (job.finishedAt !== undefined && Date.now() - job.finishedAt > JOB_KEEP_MS) {
                this.jobs.delete(id);
            }
        }
        try {
            const folder = this.folder();
            const ids = new Set((await readdir(folder)).filter((name) => name.endsWith(".part")).map((name) => name.slice(0, -".part".length)));
            for (const meta of await this.allMeta()) {
                ids.add(meta.id);
            }
            for (const id of ids) {
                if (this.writing.has(id) || ["queued", "processing"].includes(this.jobs.get(id)?.state ?? "")) {
                    continue;
                }
                const lastWrite = (await stat(this.partFile(folder, id)).catch(() => undefined))?.mtimeMs;
                if (lastWrite === undefined || Date.now() - lastWrite > STALE_UPLOAD_MS) {
                    AppLogger.info(undefined, { message: `[Upload] Removing the stale upload ${id}` });
                    await this.remove(id);
                }
            }
        } catch (error) {
            AppLogger.warn(undefined, { message: "[Upload] Could not remove stale uploads", error });
        }
    }
}

export const uploadService = new UploadService(VideoServerWebSocketManager.getInstance());
