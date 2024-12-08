import { createSlice } from "@reduxjs/toolkit";
import { MenuItemPublic } from "@uxp/common";
import { fetchMenuItems } from "./headerMenuThunk";

type HeaderMenuState = {
    items: MenuItemPublic[];
};

const initialState: HeaderMenuState = {
    items: [],
};

const headerMenuSlice = createSlice({
    name: "headerMenu",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(fetchMenuItems.fulfilled, (state, action) => {
            state.items = action.payload.menuItems;
        });
    },
});

export default headerMenuSlice.reducer;
