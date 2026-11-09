import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BrowserPlayerState } from "./browserPlayerLink";

type BrowserPlayerSliceState = {
    /** Undefined when there is no player tab, or it has not answered for a while. */
    state: BrowserPlayerState | undefined;
    /** When the state arrived, epoch milliseconds. */
    receivedAt: number;
};

const browserPlayerSlice = createSlice({
    name: "browserPlayer",
    initialState: { state: undefined, receivedAt: 0 } as BrowserPlayerSliceState,
    reducers: {
        browserPlayerReceived: (slice, action: PayloadAction<BrowserPlayerState>) => {
            slice.state = action.payload;
            slice.receivedAt = Date.now();
        },
        browserPlayerGone: (slice) => {
            slice.state = undefined;
        },
    },
});

export const { browserPlayerReceived, browserPlayerGone } = browserPlayerSlice.actions;
export const browserPlayerReducer = browserPlayerSlice.reducer;
