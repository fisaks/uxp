import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

const selectDeviceAvailabilityState = (state: RootState) => state.deviceAvailability;

export const selectDeviceAvailabilityMap = createSelector(
    selectDeviceAvailabilityState,
    (availability) => availability.byKey,
);

/** The availability entry (status and since when) of one device (key `edge:device`): undefined without a key or without
 *  data. The entry object only changes when its own device changes, so a tile that selects it re-renders only then. */
export const selectDeviceAvailabilityByKey = (deviceKey: string | undefined) =>
    (state: RootState) => (deviceKey ? state.deviceAvailability.byKey[deviceKey] : undefined);
