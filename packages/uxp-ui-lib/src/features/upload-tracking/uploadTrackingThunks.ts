
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
import { AxiosUtil } from '@uxp/common';

//let uploadHandler: UploadHandler | undefined;

/*export function configureUploadHandler(handler: UploadHandler) {
    uploadHandler = handler;
}*/

async function internalStartUpload<UploadResult>(file: File, id: string, uploadHandler: UploadHandler<UploadResult>, dispatch: Dispatch): Promise<UploadResultWithTrackingId<UploadResult>> {

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
        return { id, result };
    } catch (e: any) {
        const isCanceled = e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED';
        const errorCode = isCanceled ? undefined : AxiosUtil.getMainErrorCode(e);

        dispatch(uploadFailed({ id, errorCode, canceled: isCanceled }));
        return { id, error: e };
    }
}


export function startUploadTracking<UploadResult>(
    file: File,
    uploadHandler: UploadHandler<UploadResult>,
    dispatch: Dispatch
): UploadStartedWithTrackingId<UploadResult> {
    const id = nanoid();
    const promise = internalStartUpload(file, id, uploadHandler, dispatch);
    return { id, promise };
}

export function retryUploadTracking<UploadResult>(
    id: string,
    getUploads: () => UploadTrackingState["uploads"],
    uploadHandler: UploadHandler<UploadResult>,
    dispatch: Dispatch
): UploadStartedWithTrackingId<UploadResult> {
    console.info('[UploadTracking] Retrying upload with id:', id,getUploads());
   
    if (!activeUploads[id]?.file) throw new Error('No file in memory to retry');
    const upload = getUploads()[id];
    if (!upload || !['error', 'canceled'].includes(upload.status)) throw new Error('File is not in a retryable state');
    
    const promise = internalStartUpload(
        activeUploads[id].file, id, uploadHandler, dispatch);

    return { id, promise };
}

export function startMultipleUploadsTracking<UploadResult>(
    files: File[],
    uploadHandler: UploadHandler<UploadResult>,
    dispatch: Dispatch
): UploadStartedWithTrackingId<UploadResult>[] {
    return files.map(file => {
        const id = nanoid();
        const promise = internalStartUpload(file, id, uploadHandler, dispatch);
        return { id, promise };
    });
}

