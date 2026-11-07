import { ChromecastState } from "@aud/common";
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

type ChromecastSliceState = {
    /** Missing until the server has sent the first state. */
    state?: ChromecastState;
    /** When the browser received the state, since the position in it moves on from that time while playing. */
    receivedAt: number;
};

const chromecastSlice = createSlice({
    name: "chromecast",
    initialState: { receivedAt: 0 } as ChromecastSliceState,
    reducers: {
        chromecastStateReceived: {
            reducer(sliceState, action: PayloadAction<{ state: ChromecastState; receivedAt: number }>) {
                sliceState.state = action.payload.state;
                sliceState.receivedAt = action.payload.receivedAt;
            },
            prepare: (state: ChromecastState) => ({ payload: { state, receivedAt: Date.now() } }),
        },
    },
});

export const { chromecastStateReceived } = chromecastSlice.actions;
export default chromecastSlice.reducer;
