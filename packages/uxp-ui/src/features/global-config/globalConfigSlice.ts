import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GlobalConfigData, GlobalConfigPayload, GlobalConfigPublic, FullGlobalConfigResponse, PublicGlobalConfigResponse } from "@uxp/common";
import { fetchFullGlobalSettings, fetchPublicGlobalSettings } from "./globalConfigThunk";

type GlobalConfigState = {
    /** Public config (siteName only) — always available */
    config?: GlobalConfigPublic;
    /** Full admin config — only populated after fetchFullGlobalSettings */
    fullConfig?: GlobalConfigData;
    updatedAt?: string;
};

const initialState: GlobalConfigState = {
    config: undefined,
    fullConfig: undefined,
    updatedAt: undefined,
};

const globalSettingsSlice = createSlice({
    name: "globalSettings",
    initialState,
    reducers: {
        configFieldUpdated(state, action: PayloadAction<GlobalConfigPayload>) {
            const { key, value } = action.payload;
            if (key === "siteName" && state.config) {
                state.config.siteName = value;
            }
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchPublicGlobalSettings.fulfilled, (state, action: PayloadAction<PublicGlobalConfigResponse>) => {
            state.config = action.payload.config;
            state.updatedAt = action.payload.updatedAt;
        });

        builder.addCase(fetchFullGlobalSettings.fulfilled, (state, action: PayloadAction<FullGlobalConfigResponse>) => {
            state.fullConfig = action.payload.config;
            state.config = action.payload.config;
            state.updatedAt = action.payload.updatedAt;
        });
    },
});

export const { configFieldUpdated } = globalSettingsSlice.actions;
export default globalSettingsSlice.reducer;
