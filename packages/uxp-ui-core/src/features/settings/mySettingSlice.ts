import { createSlice } from "@reduxjs/toolkit";
import { UserSettingsResponse } from "@uxp/common";
import { logout } from "../user/userThunks";
import { fetchMySettings, updateMySettings } from "./mySettingThunk";

// Settings state interface
type MySettingsState = {
    data?: UserSettingsResponse;
};

const initialState: MySettingsState = {
    data: undefined,
};

const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchMySettings.fulfilled, (state, action) => {
                state.data = action.payload;
            })
            .addCase(updateMySettings.fulfilled, (state, action) => {
                state.data = action.payload;
            })
            .addCase(logout.fulfilled, (state) => {
                state.data = undefined;
            });
    },
});

export default settingsSlice.reducer;
