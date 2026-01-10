import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/uxp.store";

export const selectAdminUserManagement = (state: RootState) => state.adminUserManagement;

export const selectUserSearchResult = createSelector(selectAdminUserManagement, (adminUserManagement) => adminUserManagement.users);
export const selectUserSearchPagination = createSelector(
    selectAdminUserManagement,
    (adminUserManagement) => adminUserManagement.pagination
);
