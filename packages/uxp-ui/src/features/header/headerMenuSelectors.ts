import { createSelector } from "@reduxjs/toolkit";

import { RootState } from "../../app/store";

export const selectHeaderMenuState = (state: RootState) => state.headerMenu;

export const selectHeaderMenuItems = () =>
    createSelector(selectHeaderMenuState, (headerMenuState) => headerMenuState.items);
