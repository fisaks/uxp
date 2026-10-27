import { createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";

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
export const selectConnected = (state: RootState) => state.connection.connected;
export default connectionSlice.reducer;
