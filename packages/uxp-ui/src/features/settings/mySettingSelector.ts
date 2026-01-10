import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/uxp.store";

export const selectMySettingState = (state: RootState) => state.mySettings;

export const selectMySetting = () => createSelector(selectMySettingState, (mySettingsState) => mySettingsState.data);
