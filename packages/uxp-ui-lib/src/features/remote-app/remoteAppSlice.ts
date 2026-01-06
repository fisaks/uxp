import { createSlice } from "@reduxjs/toolkit";
import { UserPublic } from "@uxp/common";

export type RemoteAppState = {
    user?: UserPublic;
};
const initialState: RemoteAppState = {
    user: window.uxp?.getUser ? window.uxp.getUser() : undefined,
};

const remoteAppSlice = createSlice({
    name: "remote-app",
    initialState,
    reducers: {
        setUser(state, action) {
            state.user = action.payload;
        },
    },
});

export const { setUser } = remoteAppSlice.actions;
export default remoteAppSlice.reducer;
