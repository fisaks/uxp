import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

const selectDeviceAvailabilityState = (state: RootState) => state.deviceAvailability;

export const selectDeviceAvailabilityMap = createSelector(
    selectDeviceAvailabilityState,
    (availability) => availability.byKey,
);
