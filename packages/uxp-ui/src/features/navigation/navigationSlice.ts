import { createSlice } from "@reduxjs/toolkit";
import { NavigationRoute } from "@uxp/common";
import { fetchNavigation } from "./navigationThunk";

export type NavigationState = {
    routes: NavigationRoute[];
    pageLookup: Record<string, NavigationRoute["page"]>;
};

const initialState: NavigationState = {
    routes: [],
    pageLookup: {},
};

const navigationSlice = createSlice({
    name: "navigation",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(fetchNavigation.fulfilled, (state, action) => {
            state.routes = action.payload.routes ?? [];
            action.payload.routes.forEach((route) => {
                if (route.page?.uuid) {
                    state.pageLookup[route.page.uuid] = route.page;
                }
            });
        });
    },
});

export default navigationSlice.reducer;
