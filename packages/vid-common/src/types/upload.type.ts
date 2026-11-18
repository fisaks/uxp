/** The largest file the home video upload takes: 10 GB (10 240 MB, 10 737 418 240 bytes). Android cameras often split a long clip at 4 GB. */
export const UPLOAD_MAX_FILE_BYTES = 10 * 1024 * 1024 * 1024;

/** The largest chunk one request may carry: 8 MB (8 192 KB, 8 388 608 bytes). The client sends chunks of this size, the last one is smaller. */
export const UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;

export type UploadCreateRequest = {
    sizeBytes: number;
    /** What the phone calls the file. Only a hint for a title, never used as a path. */
    originalName?: string;
    /** The date of the clip (YYYY-MM-DD). null means no date; left out means the server takes it from the file. */
    date?: string | null;
    /** sha1 (40 hex digits) of the first and the last megabyte of the file. With the name and the size it lets the server find the stopped upload of the same file, so it can go on after a reload. */
    fingerprint?: string;
};

/**
 * `uploading` until the last chunk is in, then `queued` until it is its turn, `processing` while the file is checked and made ready,
 * then `done` or `failed`. `removed` is only pushed, when an upload that was not finished is taken away.
 */
export type UploadState = "uploading" | "queued" | "processing" | "done" | "failed" | "removed";

/** An upload in progress. `offset` is how many bytes the server has, the next chunk starts there. */
export type UploadSession = {
    id: string;
    /** The username of the uploader. Everyone sees all uploads, only the owner (and an admin, for removing) can act on one. */
    owner: string;
    sizeBytes: number;
    /** What the phone called the file, for the list of uploads that were left open. */
    name?: string;
    offset: number;
    /** All bytes are here. */
    complete: boolean;
    state: UploadState;
    /** Only for `uploading`: someone wrote to it a moment ago, so it is being sent from another device or tab and cannot be taken over yet. */
    active?: boolean;
    /** When the state is `queued`: 1 is the next one to be made ready. */
    queuePosition?: number;
    /** When the state is `processing`: how far the conversion is, 0 to 100. Absent while it is not known. */
    percent?: number;
    /** The clip that was made, when the state is `done`. */
    clipId?: string;
    /** An `ErrorCodes` value that says why the state is `failed`. */
    errorCode?: string;
};

export type UploadParams = {
    id: string;
};

export type UploadChunkQuery = {
    offset: number;
};

/** Whether uploads are taken right now. */
export type UploadStatus = {
    enabled: boolean;
    maxFileBytes: number;
    chunkBytes: number;
    freeBytes: number;
};
