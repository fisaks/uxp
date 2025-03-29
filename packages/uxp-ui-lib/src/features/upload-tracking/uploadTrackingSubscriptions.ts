
import { UploadListener, UploadStatus } from './uploadTracking.types';

const uploadListeners = new Set<UploadListener>();


export function subscribeToUploadStatus(
    callback: UploadListener
): () => void {
    console.info("[UploadTracking] Subscribing to upload status");
    uploadListeners.add(callback);
    return () => {
        console.info("[UploadTracking] Unsubscribing from upload status", uploadListeners.has(callback));
        uploadListeners.delete(callback);
    };
}

export function notifyUploadListeners(id: string, status: UploadStatus) {
    console.info("[UploadTracking] Notifying upload listeners", uploadListeners.size, id, status);
    uploadListeners.forEach(cb => cb(id, status));
}
