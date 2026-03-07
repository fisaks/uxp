import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RuntimeInteractionView, UhnViewsResponse } from "@uhn/common";

export type ViewsState = {
    byId: Record<string, RuntimeInteractionView>;
    allIds: string[];
    isLoaded: boolean;
};

const initialState: ViewsState = {
    byId: {},
    allIds: [],
    isLoaded: false,
};

const viewsSlice = createSlice({
    name: "views",
    initialState,
    reducers: {
        viewsLoaded(state, action: PayloadAction<{ response: UhnViewsResponse }>) {
            state.byId = {};
            state.allIds = [];
            for (const v of action.payload.response.views) {
                state.byId[v.id] = v;
                state.allIds.push(v.id);
            }
            state.isLoaded = true;
        },
        viewsCleared(state) {
            state.byId = {};
            state.allIds = [];
            state.isLoaded = false;
        },
    },
});

export const { viewsLoaded, viewsCleared } = viewsSlice.actions;
export default viewsSlice.reducer;
