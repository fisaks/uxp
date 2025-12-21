import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

export const selectRuntimeState = (state: RootState) => state.runtimeState;

export const selectRuntimeStateById = (id: string) => createSelector(selectRuntimeState, (runtimeState) => runtimeState.byResourceId[id]);
export const selectIsRuntimeStateLoaded = createSelector(selectRuntimeState, (runtimeState) => runtimeState.isLoaded);

