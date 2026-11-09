import type { RootState } from "../../app/store";

export const selectCastState = (root: RootState) => root.cast.state;
export const selectCastError = (root: RootState) => root.cast.error;
export const selectQueued = (root: RootState) => root.cast.queued;
