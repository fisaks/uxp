import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

const selectAmplifierSliceState = (state: RootState) => state.amplifier;

/** Missing until the server has sent the first state. */
export const selectAmplifierState = createSelector([selectAmplifierSliceState], (amplifier) => amplifier.state);
