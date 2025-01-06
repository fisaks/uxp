import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

export const selectGlobalConfigState = (state: RootState) => state.globalConfig;

export const selectGlobalConfig = createSelector(selectGlobalConfigState, (globalConfig) => globalConfig.config);
