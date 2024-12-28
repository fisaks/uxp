import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

const selectTemplateState = (state: RootState) => state.template;

export const selectTemplateValue = createSelector([selectTemplateState], (templateState) => templateState.value);
