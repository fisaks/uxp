import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

export const selectUserState = (state: RootState) => state.user;

export const selectCurrentUser = () => createSelector(selectUserState, (userState) => userState.user);

export const selectIsLoggedInUser = () =>
    createSelector(selectUserState, (userState) => (userState.user?.roles?.length ?? 0) > 0);
