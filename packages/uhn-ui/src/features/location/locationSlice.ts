import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RuntimeLocation, UhnLocationsResponse } from "@uhn/common";

export type LocationsState = {
    byId: Record<string, RuntimeLocation>;
    allIds: string[];
    isLoaded: boolean;
};

const initialState: LocationsState = {
    byId: {},
    allIds: [],
    isLoaded: false,
};

const locationsSlice = createSlice({
    name: "locations",
    initialState,
    reducers: {
        locationsLoaded(state, action: PayloadAction<{ response: UhnLocationsResponse }>) {
            state.byId = {};
            state.allIds = [];
            for (const loc of action.payload.response.locations) {
                state.byId[loc.id] = loc;
                state.allIds.push(loc.id);
            }
            state.isLoaded = true;
        },
        locationsCleared(state) {
            state.byId = {};
            state.allIds = [];
            state.isLoaded = false;
        },
    },
});

export const { locationsLoaded, locationsCleared } = locationsSlice.actions;
export default locationsSlice.reducer;
