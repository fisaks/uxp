import { createSlice } from "@reduxjs/toolkit";
import { UserPubllic } from "@uxp/common";
import { searchUsers } from "./userSearchThunk";

type UserSearchState = {
    users: UserPubllic[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        pageSize: number;
    };
};

const initialState: UserSearchState = {
    users: [],
    pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        pageSize: 10,
    },
};

const usersSlice = createSlice({
    name: "users",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(searchUsers.fulfilled, (state, action) => {
            state.users = action.payload.data;
            state.pagination = action.payload.pagination;
        });
    },
});

export default usersSlice.reducer;
