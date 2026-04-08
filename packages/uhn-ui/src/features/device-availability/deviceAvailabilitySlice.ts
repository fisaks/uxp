import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DeviceAvailabilityEntry, UhnAvailabilitySnapshotResponse } from "@uhn/common";

type DeviceAvailabilityState = {
    byKey: Record<string, { available: boolean; updatedAt: number }>;
};

const initialState: DeviceAvailabilityState = {
    byKey: {},
};

const deviceAvailabilitySlice = createSlice({
    name: "deviceAvailability",
    initialState,
    reducers: {
        availabilitySnapshotReceived(state, action: PayloadAction<UhnAvailabilitySnapshotResponse>) {
            for (const entry of action.payload.entries) {
                state.byKey[`${entry.edge}:${entry.device}`] = {
                    available: entry.available,
                    updatedAt: entry.updatedAt,
                };
            }
        },
        availabilityChangeReceived(state, action: PayloadAction<DeviceAvailabilityEntry>) {
            const entry = action.payload;
            state.byKey[`${entry.edge}:${entry.device}`] = {
                available: entry.available,
                updatedAt: entry.updatedAt,
            };
        },
    },
});

export const { availabilitySnapshotReceived, availabilityChangeReceived } = deviceAvailabilitySlice.actions;
export default deviceAvailabilitySlice.reducer;
