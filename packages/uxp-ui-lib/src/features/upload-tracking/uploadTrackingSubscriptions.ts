
import { UploadListener, UploadStatus } from './uploadTracking.types';

const uploadListeners = new Set<UploadListener<any>>();


export function subscribeToUploadStatus<UploadResult>(
    callback: UploadListener<UploadResult>
): () => void {
    console.info("[UploadTracking] Subscribing to upload status");
    uploadListeners.add(callback);
    return () => {
        console.info("[UploadTracking] Unsubscribing from upload status", uploadListeners.has(callback));
        uploadListeners.delete(callback);
    };
}

export function notifyUploadListeners(id: string, status: UploadStatus<any>) {
    console.info("[UploadTracking] Notifying upload listeners", uploadListeners.size, id, status);
    uploadListeners.forEach(cb => cb(id, status));
}
