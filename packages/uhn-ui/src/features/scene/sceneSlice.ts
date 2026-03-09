import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RuntimeScene, UhnScenesResponse } from "@uhn/common";

export type ScenesState = {
    byId: Record<string, RuntimeScene>;
    allIds: string[];
    isLoaded: boolean;
};

const initialState: ScenesState = {
    byId: {},
    allIds: [],
    isLoaded: false,
};

const scenesSlice = createSlice({
    name: "scenes",
    initialState,
    reducers: {
        scenesLoaded(state, action: PayloadAction<{ response: UhnScenesResponse }>) {
            state.byId = {};
            state.allIds = [];
            for (const scene of action.payload.response.scenes) {
                state.byId[scene.id] = scene;
                state.allIds.push(scene.id);
            }
            state.isLoaded = true;
        },
        scenesCleared(state) {
            state.byId = {};
            state.allIds = [];
            state.isLoaded = false;
        },
    },
});

export const { scenesLoaded, scenesCleared } = scenesSlice.actions;
export default scenesSlice.reducer;
