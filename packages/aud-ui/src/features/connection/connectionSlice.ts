import { createSlice } from "@reduxjs/toolkit";

/** Whether messages can be sent to the server: the connection is open and the UXP proxy behind it has settled. */
const connectionSlice = createSlice({
    name: "connection",
    initialState: { connected: false },
    reducers: {
        connectionReady(sliceState) {
            sliceState.connected = true;
        },
        connectionLost(sliceState) {
            sliceState.connected = false;
        },
    },
});

export const { connectionReady, connectionLost } = connectionSlice.actions;
export default connectionSlice.reducer;
