import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RuntimeOverviewPayload, RuntimeStatus } from "@uhn/common";

export type RuntimeOverviewState = {
    statusById: Record<string, RuntimeStatus>;
};

const initialState: RuntimeOverviewState = {
    statusById: {},
};

const runtimeOverviewSlice = createSlice({
    name: "runtimeOverview",
    initialState,
    reducers: {
        runtimeOverviewLoaded(state, action: PayloadAction<{ response: RuntimeOverviewPayload }>) {
            const { runtimes } = action.payload.response;
            const statusById: Record<string, RuntimeStatus> = {};
            for (const rt of runtimes) {
                statusById[rt.runtimeId] = rt.status;
            }
            state.statusById = statusById;
        },
    },
});

export const { runtimeOverviewLoaded } = runtimeOverviewSlice.actions;
export default runtimeOverviewSlice.reducer;
