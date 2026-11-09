import { CastState } from "@vid/common";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type CastSliceState = {
    /** Undefined until the first state has arrived. */
    state: CastState | undefined;
    /** The text of the last command that failed. */
    error: string | undefined;
    /** The last clips put in a queue, for the banner. `id` counts up so the same clips twice show it twice. */
    queued: { id: number; clipIds: string[]; text: string } | undefined;
};

const castSlice = createSlice({
    name: "cast",
    initialState: { state: undefined, error: undefined, queued: undefined } as CastSliceState,
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
        clipsQueued: (slice, action: PayloadAction<{ clipIds: string[]; text: string }>) => {
            slice.queued = { id: (slice.queued?.id ?? 0) + 1, ...action.payload };
        },
    },
});

export const { castStateReceived, castFailed, castErrorCleared, clipsQueued } = castSlice.actions;
export const castReducer = castSlice.reducer;
