import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectUploadTracking } from "./uploadTrackingSelectors";
import { cancelUpload } from "./uploadTrackingSlice";
import { subscribeToUploadStatus } from "./uploadTrackingSubscriptions";
import { retryUploadTracking, startUploadTracking } from "./uploadTrackingThunks";

export function useUploadTracker() {
    const dispatch = useDispatch();
    const uploadTracking = useSelector(selectUploadTracking());

    const startUpload = useCallback((file: File) => {
        console.info("[useUploadTracker] Uploading file", file);
        return startUploadTracking(file, dispatch);
    }, [dispatch]);

    const cancel = useCallback((id: string) => {
        console.info("[useUploadTracker] Canceling upload", id);
        dispatch(cancelUpload(id));
    }, [dispatch]);

    const retry = useCallback((id: string) => {
        console.info("[useUploadTracker] Retrying upload", id);
        return retryUploadTracking(id, () => uploadTracking, dispatch);
    }, [uploadTracking, dispatch]);

    const getStatus = useCallback(
        (id: string) => uploadTracking[id],
        [uploadTracking]
    );

    return {
        startUpload,
        cancelUpload: cancel,
        retryUpload: retry,
        getUploadStatus: getStatus,
        subscribeToUploadStatus
    };
}
