import { createSelector } from "@reduxjs/toolkit";
import { RuntimeLocation } from "@uhn/common";
import { RootState } from "../../app/store";

const selectLocationState = (state: RootState) => state.locations;

export const selectAllLocations = createSelector(
    [selectLocationState],
    (locations): RuntimeLocation[] => locations.allIds.map(id => locations.byId[id])
);

export const selectLocationsLoaded = createSelector(
    [selectLocationState],
    (locations): boolean => locations.isLoaded
);

export const selectLocationById = createSelector(
    [selectLocationState, (_state: RootState, locationId: string) => locationId],
    (locations, locationId): RuntimeLocation | undefined => locations.byId[locationId]
);
