import { ErrorCode } from "@uxp/common";

export type UploadStatus<UploadResult> = {
    id: string;
    file: {
        lastModified: number
        name: string
        size: number
        type: string
    }
    progress: number;
    speed: number;
    status: 'uploading' | 'done' | 'error' | 'canceled';
    errorCode?: ErrorCode;
    startedAt?: number;
    result?: UploadResult;
};

export type UploadResultWithTrackingId<UploadResult> = { id: string, error?: any, result?: UploadResult };
export type UploadStartedWithTrackingId<UploadResult> = { id: string, promise: Promise<UploadResultWithTrackingId<UploadResult>> };

export type UploadHandler<UploadResult> = (
    file: File,
    onProgress?: (e: TrackingProgressEvent) => void,
    signal?: AbortSignal
) => Promise<UploadResult>;



export type TrackingProgressEvent = {
    total: number | undefined;
    loaded: number;
}
export type UploadListener<UploadResult> = (id: string, status: UploadStatus<UploadResult>) => void;
