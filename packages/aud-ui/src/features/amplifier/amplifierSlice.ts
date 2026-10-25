import { AmplifierState } from "@aud/common";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";

type AmplifierSliceState = {
    /** Missing until the server has sent the first state. */
    state?: AmplifierState;
};

const amplifierSlice = createSlice({
    name: "amplifier",
    initialState: {} as AmplifierSliceState,
    reducers: {
        amplifierStateReceived(sliceState, action: PayloadAction<AmplifierState>) {
            sliceState.state = action.payload;
        },
    },
});

export const { amplifierStateReceived } = amplifierSlice.actions;
export const selectAmplifierState = (state: RootState) => state.amplifier.state;
export default amplifierSlice.reducer;
