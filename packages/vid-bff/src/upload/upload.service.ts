import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { UPLOAD_CHUNK_BYTES, UPLOAD_MAX_FILE_BYTES, UploadCreateRequest, UploadSession, UploadStatus } from "@vid/common";
import { randomBytes } from "crypto";
import { createWriteStream } from "fs";
import { mkdir, readdir, readFile, rm, stat, statfs, writeFile } from "fs/promises";
import path from "path";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import { CLEANUP_INTERVAL_MS, MAX_SESSIONS_PER_USER, STALE_UPLOAD_MS, UPLOAD_FREE_SPACE_FACTOR, uploadConfig } from "./upload.config";

/** What is kept about an upload beside its bytes. The owner comes from the token, never from the client. */
type UploadMeta = {
    id: string;
    owner: string;
    sizeBytes: number;
    originalName?: string;
    createdAt: string;
};

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
    /** Uploads that are being written to right now, so two requests cannot append to one file. */
    private readonly writing = new Set<string>();
    private timer?: NodeJS.Timeout;

    async start(): Promise<void> {
        if (!uploadConfig.folder) {
            AppLogger.info(undefined, { message: "VID_MEDIA_ROOT is not set, uploads are off" });
            return;
        }
        await mkdir(uploadConfig.folder, { recursive: true });
        await this.removeStale();
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

    async create(owner: string, request: UploadCreateRequest): Promise<UploadSession> {
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
            sizeBytes: request.sizeBytes,
            originalName: request.originalName,
            createdAt: new Date().toISOString(),
        };
        await writeFile(this.partFile(folder, meta.id), "");
        await writeFile(this.metaFile(folder, meta.id), JSON.stringify(meta));
        return { id: meta.id, sizeBytes: meta.sizeBytes, offset: 0, complete: false };
    }

    /** Where the upload is. The client asks this to resume after a break. */
    async get(owner: string, id: string): Promise<UploadSession> {
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
            return this.session(meta, await this.offsetOf(id));
        } finally {
            this.writing.delete(id);
        }
    }

    async abort(owner: string, id: string): Promise<void> {
        const meta = await this.ownedMeta(owner, id);
        if (this.writing.has(id)) {
            throw new AppErrorV2({ code: ErrorCodes.CONFLICT, message: "The upload is being written to" });
        }
        await this.remove(meta.id);
    }

    private session(meta: UploadMeta, offset: number): UploadSession {
        return { id: meta.id, sizeBytes: meta.sizeBytes, offset, complete: offset >= meta.sizeBytes };
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
        try {
            const folder = this.folder();
            const ids = new Set((await readdir(folder)).filter((name) => name.endsWith(".part")).map((name) => name.slice(0, -".part".length)));
            for (const meta of await this.allMeta()) {
                ids.add(meta.id);
            }
            for (const id of ids) {
                if (this.writing.has(id)) {
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

export const uploadService = new UploadService();
