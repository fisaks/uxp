export type UploadStatus = {
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
    errorMessage?: string;
    publicId?: string;
    fileName?: string;
    startedAt?: number;
};

export type UploadResult = {
    publicId: string;
    fileName: string;
};
export type UploadResultWithTrackingId = UploadResult & { id: string };
export type UploadStartedWithTrackingId = { id: string, promise: Promise<UploadResultWithTrackingId> };

export type UploadHandler = (
    file: File,
    onProgress?: (e: TrackingProgressEvent) => void,
    signal?: AbortSignal
) => Promise<UploadResult>;



export type TrackingProgressEvent = {
    total: number | undefined;
    loaded: number;
}
export type UploadListener = (id: string, status: UploadStatus) => void;
