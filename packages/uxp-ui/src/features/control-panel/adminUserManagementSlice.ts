import { createSlice } from "@reduxjs/toolkit";
import { LockUserResponse, UnlockUserReponse, UpdateUserRolesResponse, UserAdminView, UserPubllic } from "@uxp/common";
import { lockUser, searchUsers, unlockUser, updateUserRoles, updateUserTokenVersion } from "./adminUserManagementThunk";
//adminUserManagementSlice
type AdminUserManagementState = {
    users: UserAdminView[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        pageSize: number;
    };
};

const initialState: AdminUserManagementState = {
    users: [],
    pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        pageSize: 10,
    },
};
const updateUser = (
    state: AdminUserManagementState,
    action: { payload: LockUserResponse | UnlockUserReponse | UpdateUserRolesResponse }
) => {
    state.users = state.users.map((user) => {
        if (user.uuid === action.payload.user.uuid) {
            return action.payload.user;
        }
        return user;
    });
};

const adminUserManagementSlice = createSlice({
    name: "adminUserManagement",
    initialState,
    reducers: {
        removeUserFromList: (state, action: { payload: { uuid: string } }) => {
            state.users = state.users.filter((user) => user.uuid !== action.payload.uuid);
        },
    },
    extraReducers: (builder) => {
        builder.addCase(searchUsers.fulfilled, (state, action) => {
            state.users = action.payload.data;
            state.pagination = action.payload.pagination;
        });
        builder.addCase(lockUser.fulfilled, updateUser);
        builder.addCase(unlockUser.fulfilled, updateUser);
        builder.addCase(updateUserRoles.fulfilled, updateUser);
        builder.addCase(updateUserTokenVersion.fulfilled, updateUser);
    },
});
export const { removeUserFromList } = adminUserManagementSlice.actions;
export default adminUserManagementSlice.reducer;
