import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

export const selectHouseState = (state: RootState) => state.houses;

export const selectAllHouses = createSelector(selectHouseState, (houseState) => houseState.houses);

export const selectHouseDiffData = createSelector(
    selectHouseState, (houseState) => houseState.diff.data);

export const selectHouseDiffLoading = createSelector(
    selectHouseState, (houseState) => houseState.diff.loading);

export const selectHouseDiffError = createSelector(
    selectHouseState, (houseState) => houseState.diff.error);
