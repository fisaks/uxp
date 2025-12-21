import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RuntimeResourceState, UhnFullStateResponse, UhnStateResponse } from "@uhn/common";


type RuntimeStateSlice = {
    byResourceId: Record<string, Pick<RuntimeResourceState, "value" | "timestamp">>;
    isLoaded: boolean;
    receivedAt?: number;
};

const initialState: RuntimeStateSlice = {
    byResourceId: {},
    isLoaded: false,
    receivedAt: undefined,
};

const runtimeStateSlice = createSlice({
    name: "runtimeState",
    initialState,
    reducers: {
        fullStateReceived(state, action: PayloadAction<{ response: UhnFullStateResponse; receivedAt: number }>) {
            state.byResourceId = {};
            for (const u of action.payload.response.states) {
                state.byResourceId[u.resourceId] = { value: u.value, timestamp: u.timestamp };
            }
            state.isLoaded = true;
            state.receivedAt = action.payload.receivedAt;
        },
        stateReceived(state, action: PayloadAction<{ response: UhnStateResponse }>) {
            const { resourceId, timestamp, value } = action.payload.response.state;
            if (!state.byResourceId[resourceId] || timestamp > state.byResourceId[resourceId].timestamp) {
                state.byResourceId[resourceId] = { value, timestamp };
            }

        },
        stateCleared(state) {
            state.byResourceId = {};
            state.isLoaded = false;
            state.receivedAt = undefined;
        },
    },
});

export const { fullStateReceived, stateReceived, stateCleared } = runtimeStateSlice.actions;

export default runtimeStateSlice.reducer;
