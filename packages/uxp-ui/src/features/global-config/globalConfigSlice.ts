import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GlobalConfigData, LatestGlobalConfigResponse, PatchGlobalConfigResponse } from "@uxp/common";
import { fetchLatestGlobalSettings, patchGlobalSetting } from "./globalConfigThunk";

type GlobalConfigState = {
    config?: GlobalConfigData;
    version?: number;
    updatedAt?: string;
};

const initialState: GlobalConfigState = {
    config: undefined,
    version: undefined,
    updatedAt: undefined,
};

// Create the slice
const globalSettingsSlice = createSlice({
    name: "globalSettings",
    initialState,
    reducers: {
        // Optionally, you can add reducers for local updates
    },
    extraReducers: (builder) => {
        builder.addCase(fetchLatestGlobalSettings.fulfilled, (state, action: PayloadAction<LatestGlobalConfigResponse>) => {
            state.config = action.payload.config;
            state.version = action.payload.version;
            state.updatedAt = action.payload.updatedAt;
        });

        builder.addCase(patchGlobalSetting.fulfilled, (state, action: PayloadAction<PatchGlobalConfigResponse>) => {
            state.config = action.payload.config;
            state.version = action.payload.version;
            state.updatedAt = action.payload.updatedAt;
        });
    },
});

// Export the slice reducer
export default globalSettingsSlice.reducer;
