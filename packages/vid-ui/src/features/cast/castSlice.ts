import { CastState } from "@vid/common";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type CastSliceState = {
    /** Undefined until the first state has arrived. */
    state: CastState | undefined;
    /** The text of the last command that failed. */
    error: string | undefined;
};

const castSlice = createSlice({
    name: "cast",
    initialState: { state: undefined, error: undefined } as CastSliceState,
    reducers: {
        /** The live state from the WebSocket, or the answer of a command. */
        castStateReceived: (slice, action: PayloadAction<CastState>) => {
            slice.state = action.payload;
        },
        castFailed: (slice, action: PayloadAction<string>) => {
            slice.error = action.payload;
        },
        castErrorCleared: (slice) => {
            slice.error = undefined;
        },
    },
});

export const { castStateReceived, castFailed, castErrorCleared } = castSlice.actions;
export const castReducer = castSlice.reducer;
