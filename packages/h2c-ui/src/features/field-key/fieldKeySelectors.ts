import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

export const selectFieldKeyState = (state: RootState) => state.fieldKeys;

export const selectFieldKeyTypes = createSelector(selectFieldKeyState, (fieldKeyState) => fieldKeyState.types);