import { createSelector } from "@reduxjs/toolkit";

import { RootState } from "../../app/store";
import { LoadingKey } from "../loading/loadingThunk";

export const selectErrorState = (state: RootState) => state.error;

export const selectError = (key: LoadingKey) => createSelector(selectErrorState, (errorState) => errorState[key]);
