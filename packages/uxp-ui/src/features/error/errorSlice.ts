import { createSlice } from "@reduxjs/toolkit";
import { ApiErrorResponse } from "@uxp/common";
import { LoadingKey } from "../loading/loadingThunk";

type ErrorState = Partial<Record<LoadingKey, ApiErrorResponse>>;

const initialState: ErrorState = {};

const errorSlice = createSlice({
    name: "error",
    initialState,
    reducers: {
        setError: (state, action: { payload: { key: LoadingKey; error: ApiErrorResponse } }) => {
            state[action.payload.key] = action.payload.error;
        },
        clearError: (state, action: { payload: LoadingKey }) => {
            delete state[action.payload];
        },
    },
});

export const { setError, clearError } = errorSlice.actions;
export default errorSlice.reducer;
