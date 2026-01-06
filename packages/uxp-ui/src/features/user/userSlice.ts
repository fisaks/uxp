import { createSlice } from "@reduxjs/toolkit";
import { UserPublic } from "@uxp/common";
import { login, logout, whoami } from "./userThunks";
//import { ApiErrorResponse, LoginResponse, UserPubllic } from "@uxp/common";

type UserState = {
    user?: UserPublic;
};

const initialState: UserState = {
    user: undefined,
};

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(login.fulfilled, (state, action) => {
                state.user = action.payload?.user;
            })
            .addCase(whoami.fulfilled, (state, action) => {
                state.user = action.payload?.user;
            })
            .addCase(logout.fulfilled, (state) => {
                state.user = undefined;
            });
    },
});

export default userSlice.reducer;
