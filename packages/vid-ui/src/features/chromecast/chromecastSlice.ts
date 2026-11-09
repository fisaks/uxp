import { ChromecastsState } from "@vid/common";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const chromecastSlice = createSlice({
    name: "chromecast",
    initialState: { state: undefined as ChromecastsState | undefined },
    reducers: {
        /** The live state from the WebSocket, or the answer of a command. */
        chromecastsReceived: (slice, action: PayloadAction<ChromecastsState>) => {
            slice.state = action.payload;
        },
    },
});

export const { chromecastsReceived } = chromecastSlice.actions;
export const chromecastReducer = chromecastSlice.reducer;
