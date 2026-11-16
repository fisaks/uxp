/** The largest file the home video upload takes: 10 GB (10 240 MB, 10 737 418 240 bytes). Android cameras often split a long clip at 4 GB. */
export const UPLOAD_MAX_FILE_BYTES = 10 * 1024 * 1024 * 1024;

/** The largest chunk one request may carry: 8 MB (8 192 KB, 8 388 608 bytes). The client sends chunks of this size, the last one is smaller. */
export const UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;

export type UploadCreateRequest = {
    sizeBytes: number;
    /** What the phone calls the file. Only a hint for a title, never used as a path. */
    originalName?: string;
};

/** An upload in progress. `offset` is how many bytes the server has, the next chunk starts there. */
export type UploadSession = {
    id: string;
    sizeBytes: number;
    offset: number;
    /** All bytes are here. */
    complete: boolean;
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
