import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectUploadTracking } from "./uploadTrackingSelectors";
import { cancelUpload } from "./uploadTrackingSlice";
import { subscribeToUploadStatus } from "./uploadTrackingSubscriptions";
import { retryUploadTracking, startUploadTracking } from "./uploadTrackingThunks";
import { UploadHandler } from "./uploadTracking.types";

export function useUploadTracker<UploadResult>(uploadHandler: UploadHandler<UploadResult>,) {
    const dispatch = useDispatch();
    const uploadTracking = useSelector(selectUploadTracking());

    const uploadTrackingRef = useRef(uploadTracking);
    useEffect(() => {
        uploadTrackingRef.current = uploadTracking;
    }, [uploadTracking]);

    const startUpload = useCallback((file: File) => {
        console.info("[useUploadTracker] Uploading file", file);
        return startUploadTracking(file, uploadHandler, dispatch);
    }, [uploadHandler, dispatch]);

    const cancel = useCallback((id: string) => {
        console.info("[useUploadTracker] Canceling upload", id);
        dispatch(cancelUpload(id));
    }, [dispatch]);

    const retry = useCallback((id: string) => {
        console.info("[useUploadTracker] Retrying upload", id);
        return retryUploadTracking(id, () => uploadTrackingRef.current, uploadHandler, dispatch);
    }, [uploadHandler, dispatch]);

    const getStatus = useCallback(
        (id: string) => uploadTrackingRef.current[id],
        []
    );
    return useMemo(() => ({
        startUpload,
        cancelUpload: cancel,
        retryUpload: retry,
        getUploadStatus: getStatus,
        subscribeToUploadStatus
    }), [startUpload, cancel, retry, getStatus]);
}
