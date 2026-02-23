import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RuntimeResourceState, UhnFullStateResponse, UhnStateResponse } from "@uhn/common";

type RuntimeStateEntry = Pick<RuntimeResourceState, "value" | "timestamp" | "details">;

type RuntimeStateSlice = {
    byResourceId: Record<string, RuntimeStateEntry>;
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
                state.byResourceId[u.resourceId] = { value: u.value, timestamp: u.timestamp, details: u.details };
            }
            state.isLoaded = true;
            state.receivedAt = action.payload.receivedAt;
        },
        stateReceived(state, action: PayloadAction<{ response: UhnStateResponse }>) {
            const { resourceId, timestamp, value, details } = action.payload.response.state;
            if (!state.byResourceId[resourceId] || timestamp > state.byResourceId[resourceId].timestamp) {
                state.byResourceId[resourceId] = { value, timestamp, details };
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
