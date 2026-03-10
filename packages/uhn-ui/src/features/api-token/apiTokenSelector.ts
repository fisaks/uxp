import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

const selectApiTokenState = (state: RootState) => state.apiToken;

export const selectCreateDialog = createSelector(
    selectApiTokenState,
    (apiToken) => apiToken.createDialog
);

export const selectCreatedDialog = createSelector(
    selectApiTokenState,
    (apiToken) => apiToken.createdDialog
);
