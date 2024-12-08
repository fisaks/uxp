import { createSlice } from "@reduxjs/toolkit";
import { LoadingKey } from "./loadingThunk";

export type LoadingState = {
    loading: Partial<Record<LoadingKey, boolean>>;
    processed: Partial<Record<LoadingKey, boolean>>;
    inProgress: Partial<Record<LoadingKey, boolean>>; // Semaphore for actions in progress
};

const initialState: LoadingState = {
    loading: {},
    processed: {},
    inProgress: {},
};

const loadingSlice = createSlice({
    name: "loading",
    initialState,
    reducers: {
        setLoading: (state, action: { payload: LoadingKey }) => {
            state.loading[action.payload] = true;
        },
        clearLoading: (state, action: { payload: LoadingKey }) => {
            delete state.loading[action.payload];
        },
        setProcessed: (state, action: { payload: LoadingKey }) => {
            state.processed[action.payload] = true;
        },
        clearProcessed: (state, action: { payload: LoadingKey }) => {
            delete state.processed[action.payload];
        },
        startAction: (state, action: { payload: LoadingKey }) => {
            state.inProgress[action.payload] = true; // Mark as in-progress
        },
        endAction: (state, action: { payload: LoadingKey }) => {
            delete state.inProgress[action.payload]; // Clear in-progress flag
        },
    },
});

export const { setLoading, clearLoading, setProcessed, clearProcessed, startAction, endAction } = loadingSlice.actions;
export default loadingSlice.reducer;
