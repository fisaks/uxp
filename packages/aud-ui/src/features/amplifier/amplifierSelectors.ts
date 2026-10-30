import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

const selectAmplifierSliceState = (state: RootState) => state.amplifier;

/** Missing until the server has sent the first state. */
export const selectAmplifierState = createSelector([selectAmplifierSliceState], (amplifier) => amplifier.state);

/**
 * Whether the amplifier is on the input the player's sound arrives on, which is when what the player plays is what is heard.
 * Without that input known it cannot be told, so it counts as being on it. False until the amplifier has been read.
 */
export const selectAmplifierOnPlayerInput = createSelector([selectAmplifierState], (state): boolean => {
    if (!state?.info || !state.status) return false;
    return state.info.playerInput === undefined || state.status.input === state.info.playerInput;
});
