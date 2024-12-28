import { createSelector } from "@reduxjs/toolkit";
import { RemoteAppState } from "./remoteAppSlice";

export type RemoteAppPartialRootState = {
    remoteApp: RemoteAppState;
};
export const selectRemoteAppState = (state: RemoteAppPartialRootState) => state.remoteApp;

export const selectCurrentUser = createSelector(selectRemoteAppState, (remoteAppState) => remoteAppState.user);
