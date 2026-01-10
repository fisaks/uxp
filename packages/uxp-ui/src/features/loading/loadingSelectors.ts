import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/uxp.store";
import { LoadingKey } from "./loadingThunk";

export const selectLoadingState = (state: RootState) => state.loading;

export const selectIsLoading = (key: LoadingKey) => createSelector(selectLoadingState, (loadingState) => !!loadingState.loading[key]);

export const selectIsProcessed = (key: LoadingKey) => createSelector(selectLoadingState, (loadingState) => !!loadingState.processed[key]);
