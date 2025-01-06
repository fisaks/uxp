import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

export const selectUserSearchState = (state: RootState) => state.userSearch;

export const selectUserSearchResult = createSelector(selectUserSearchState, (userSearch) => userSearch.users);
export const selectUSerSearchPagination = createSelector(selectUserSearchState, (userSearch) => userSearch.pagination);
