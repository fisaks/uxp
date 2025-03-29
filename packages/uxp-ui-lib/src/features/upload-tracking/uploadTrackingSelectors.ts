import { createSelector } from "@reduxjs/toolkit";
import { UploadTrackingState } from "./uploadTrackingSlice";

export type UploadTrackingPartialRootState = {
    uploadTracking: UploadTrackingState
};
export const selectUploadTrackingState = (state: UploadTrackingPartialRootState) => state.uploadTracking;

export const selectUploadTracking = () => createSelector(selectUploadTrackingState, (trackingState) => trackingState.uploads);
