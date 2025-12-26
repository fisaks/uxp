import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";


const selectResourceCommandFeedbackState = (state: RootState) => state.resourceCommandFeedback;

export const selectResourceCommandFeedbackById = (id: string) => createSelector(selectResourceCommandFeedbackState,
    (state) => state.byResourceId[id]);
