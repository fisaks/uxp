
import { Dispatch, nanoid } from '@reduxjs/toolkit';
import { TrackingProgressEvent, UploadHandler, UploadResultWithTrackingId, UploadStartedWithTrackingId } from './uploadTracking.types';
import {
    activeUploads,
    uploadFailed,
    uploadProgress,
    uploadStarted,
    uploadSucceeded,
    UploadTrackingState,
} from './uploadTrackingSlice';

let uploadHandler: UploadHandler | undefined;

export function configureUploadHandler(handler: UploadHandler) {
    uploadHandler = handler;
}

async function internalStartUpload(file: File, id: string, dispatch: Dispatch): Promise<UploadResultWithTrackingId> {
    if (!uploadHandler) throw new Error('Upload handler not configured');

    const controller = new AbortController();
    const startedAt = Date.now();
    const fileMeta = {
        lastModified: file.lastModified,
        name: file.name,
        size: file.size,
        type: file.type,
    };

    const onProgress = (event: TrackingProgressEvent) => {
        const elapsed = (Date.now() - startedAt) / 1000;
        const progress = event.total ? (event.loaded * 100) / event.total : 0;
        const speed = event.loaded / elapsed;
        dispatch(uploadProgress({ id, progress, speed }));
    };
    dispatch(uploadStarted({ id, file: fileMeta, startedAt }));
    activeUploads[id] = { controller, file };

    const promise = uploadHandler(file, onProgress, controller.signal);

    try {
        const result = await promise;
        dispatch(uploadSucceeded({ id, result }));
        return { id, ...result };
    } catch (error: any) {
        const isCanceled = error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
        dispatch(uploadFailed({ id, error: isCanceled ? undefined : error.message, canceled: isCanceled }));
        throw error;
    }
}


export function startUploadTracking(
    file: File,
    dispatch: Dispatch
): UploadStartedWithTrackingId {
    const id = nanoid();
    const promise = internalStartUpload(file, id, dispatch);
    return { id, promise };
}

export function retryUploadTracking(
    id: string,
    getUploads: () => UploadTrackingState["uploads"],
    dispatch: Dispatch
): UploadStartedWithTrackingId {
    console.info('[UploadTracking] Retrying upload with id:', id,getUploads());
   
    if (!activeUploads[id]?.file) throw new Error('No file in memory to retry');
    const upload = getUploads()[id];
    if (!upload || !['error', 'canceled'].includes(upload.status)) throw new Error('File is not in a retryable state');
    
    const promise = internalStartUpload(
        activeUploads[id].file, id, dispatch);

    return { id, promise };
}

export function startMultipleUploadsTracking(
    files: File[],
    dispatch: Dispatch
): UploadStartedWithTrackingId[] {
    return files.map(file => {
        const id = nanoid();
        const promise = internalStartUpload(file, id, dispatch);
        return { id, promise };
    });
}

