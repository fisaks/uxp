import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { HealthSnapshot } from "@uxp/common";
import { HealthNotice } from "./health.types";
import { deriveHealthNotice } from "./health.util";



type HealthState = {
    byApp: Record<string, HealthSnapshot>;
    notice?: HealthNotice;
};

const initialState: HealthState = {
    byApp: {},
    notice: undefined,
};

const uxpHealthSlice = createSlice({
    name: "uxpHealth",
    initialState,
    reducers: {
        healthSnapshotReceived(
            state,
            action: PayloadAction<HealthSnapshot>
        ) {
            const snapshot = action.payload;
            const prev = state.byApp[snapshot.appId];

            state.byApp[snapshot.appId] = snapshot;

            const nextNotice = deriveHealthNotice(snapshot, prev);

            if (nextNotice) {
                state.notice = nextNotice;
            }
        },

        healthSnapshotCleared(
            state,
            action: PayloadAction<{ appId: string }>
        ) {
            delete state.byApp[action.payload.appId];
        },
        clearHealthNotice(state) {
            state.notice = undefined;
        },
    },
});

export const {
    healthSnapshotReceived,
    healthSnapshotCleared,
    clearHealthNotice,

} = uxpHealthSlice.actions;

export default uxpHealthSlice.reducer;
