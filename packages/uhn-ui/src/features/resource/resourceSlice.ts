import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ResourceType } from "@uhn/blueprint";
import { RuntimeResource, UhnResourcesResponse } from "@uhn/common";


export type ResourcesState = {
    byId: Record<string, RuntimeResource>;
    allIds: string[];
    isLoaded: boolean;
    receivedAt?: number;
};

const initialState: ResourcesState = {
    byId: {},
    allIds: [],
    isLoaded: false,
    receivedAt: undefined,
};

const resourcesSlice = createSlice({
    name: "resources",
    initialState,
    reducers: {
        resourcesLoaded(state, action: PayloadAction<{ response: UhnResourcesResponse; receivedAt: number }>) {
            state.byId = {};
            state.allIds = [];
            for (const r of action.payload.response.resources) {
                state.byId[r.id] = r;
                state.allIds.push(r.id);
            }
            state.isLoaded = true;
            state.receivedAt = action.payload.receivedAt;
        },
        resourcesCleared(state) {
            state.byId = {};
            state.allIds = [];
            state.isLoaded = false;
            state.receivedAt = undefined;
        },
    },
});

// Export actions
export const { resourcesLoaded, resourcesCleared } = resourcesSlice.actions;

export default resourcesSlice.reducer;
