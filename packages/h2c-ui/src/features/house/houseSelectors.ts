import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

export const selectHouseState = (state: RootState) => state.houses;

export const selectAllHouses = createSelector(
    selectHouseState,
    (houseState) => houseState.houses
);
