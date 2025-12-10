
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UploadStatus } from './uploadTracking.types';
import { notifyUploadListeners } from './uploadTrackingSubscriptions';
import { ErrorCode } from '@uxp/common';

export type UploadTrackingState = {
    uploads: Record<string, UploadStatus<any>>;
}

const initialState: UploadTrackingState = {
    uploads: {},
};

export const activeUploads: Record<string, { controller: AbortController, file: File }> = {};

const cloneUpload = (upload: UploadStatus<any>) => ({ ...upload, file: { ...upload.file }});

const uploadsSlice = createSlice({
    name: 'uploads',
    initialState,
    reducers: {
        uploadStarted(state, action: PayloadAction<{ id: string; file: UploadStatus<unknown>["file"], startedAt: number }>) {
            const { id, file, startedAt } = action.payload;
            state.uploads[id] = {
                id,
                file,
                progress: 0,
                speed: 0,
                status: 'uploading',
                startedAt
            };
        },
        uploadProgress(state, { payload }: PayloadAction<{ id: string; progress: number; speed: number }>) {
            const upload = state.uploads[payload.id];
            if (upload) {
                const newProgress = Math.max(upload.progress, payload.progress);
                upload.speed = newProgress > upload.progress ? payload.speed : 0;
                upload.progress = newProgress;

                notifyUploadListeners(upload.id, cloneUpload(upload));
            }
        },
        uploadSucceeded(state, { payload }: PayloadAction<{ id: string; result: unknown }>) {
            const upload = state.uploads[payload.id];
            if (upload) {
                // Maybe we could remove the upload here from the list
                upload.status = 'done';
                upload.result = payload.result;
                notifyUploadListeners(upload.id, cloneUpload(upload));
                delete activeUploads[payload.id];
            }
        },
        uploadFailed(
            state,
            { payload }: PayloadAction<{ id: string; errorCode?: ErrorCode; canceled?: boolean }>
        ) {
            const upload = state.uploads[payload.id];
            if (upload) {
                upload.status = payload.canceled ? 'canceled' : 'error';
                if (!payload.canceled) {
                    upload.errorCode = payload.errorCode;
                }
                notifyUploadListeners(upload.id, cloneUpload(upload));
            }
        },
        cancelUpload(state, action: PayloadAction<string>) {
            const id = action.payload;
            activeUploads[id]?.controller.abort();

            const upload = state.uploads[id];
            if (upload) {
                upload.status = 'canceled';
                notifyUploadListeners(id, cloneUpload(upload));
            }
        },
    },
});

export const {
    uploadStarted,
    uploadProgress,
    uploadSucceeded,
    uploadFailed,
    cancelUpload,
} = uploadsSlice.actions;

export default uploadsSlice.reducer;

