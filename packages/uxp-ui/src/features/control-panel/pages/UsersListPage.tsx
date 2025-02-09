import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, debounce, IconButton, Tooltip, Typography, useTheme } from "@mui/material";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../../hooks";

import { SearchConfig, SearchFilterType, SearchSortType, UserAdminView, UserRole, UserSearchRequest } from "@uxp/common";
import { Loading, SearchComponent, SearchRef } from "@uxp/ui-lib";

import { handleThunkResult } from "../../../utils/thunkUtils";
import { selectError } from "../../error/errorSelectors";
import { selectIsLoading } from "../../loading/loadingSelectors";
import { selectUserSearchPagination, selectUserSearchResult } from "../adminUserManagementSelectors";
import { lockUser, searchUsers, unlockUser, updateUserRoles, updateUserTokenVersion } from "../adminUserManagementThunk";
import PaginationWithHeader from "../componenets/PaginationWithHeader";
import UserList from "../componenets/UserList";

const initialRequest: UserSearchRequest = {
    pagination: { page: 1, size: 10 },
    filters: [],
    sort: [
        { field: "firstName", direction: "asc" },
        { field: "lastName", direction: "asc" },
    ],
};

const UsersListPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const users = useSelector(selectUserSearchResult);
    const loading = useSelector(selectIsLoading("user/search"));
    const error = useSelector(selectError("user/search"));
    const pagination = useSelector(selectUserSearchPagination);
    const isLoadingLatest = useSelector(selectIsLoading("user/search"));
    const theme = useTheme();
    const searchRef = useRef<SearchRef<UserAdminView>>(null);

    useEffect(() => {
        const a = dispatch(searchUsers(initialRequest));
    }, [dispatch]);

    const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
        dispatch(searchUsers({ ...initialRequest, pagination: { ...initialRequest.pagination, page } }));
    };

    const reload = useCallback(() => {
        searchRef.current?.triggerSearch();
    }, [searchRef.current]);
    const doSearch = useCallback((filters: SearchFilterType<UserAdminView>, sort: SearchSortType<UserAdminView>[], pageSize: number) => {
        const request: UserSearchRequest = {
            filters: [
                { field: "username", operator: "contains", value: filters.username },
                ...(filters.roles?.map((m) => ({ field: "roles", operator: "contains", value: m })) ?? []),
                { field: "createdAt", operator: "gt", value: filters.createdAtStart },
                { field: "createdAt", operator: "lt", value: filters.createdAtEnd },
                { field: "lastLogin", operator: "gt", value: filters.lastLoginStart },
                { field: "lastLogin", operator: "lt", value: filters.lastLoginEnd },
                { field: "isDisabled", operator: "eq", value: filters.isDisabled },
            ].filter((filter) => filter.value) as UserSearchRequest["filters"],
            search: filters.search?.split(" ").filter((f) => !!f),
            sort: sort.map((m) => ({ field: m.field!, direction: m.direction })),
            pagination: { page: 1, size: pageSize },
        };
        dispatch(searchUsers(request));
    }, []);

    const actionUnlockUser = useCallback(
        (uuid: string, onDone: () => void) => {
            dispatch(unlockUser({ uuid })).then(
                handleThunkResult(
                    () => {},
                    undefined,
                    () => {
                        onDone();
                    }
                )
            );
        },
        [dispatch]
    );

    const actionLockUser = useCallback(
        (uuid: string, onDone: () => void) => {
            dispatch(lockUser({ uuid })).then(
                handleThunkResult(
                    () => {},
                    undefined,
                    () => {
                        onDone();
                    }
                )
            );
        },
        [dispatch]
    );
    const actionUpdateTokenVersion = useCallback(
        (uuid: string, onDone: () => void) => {
            dispatch(updateUserTokenVersion({ uuid })).then(
                handleThunkResult(
                    () => {},
                    undefined,
                    () => {
                        onDone();
                    }
                )
            );
        },
        [dispatch]
    );

    const updateRoles = useCallback(
        debounce((uuid: string, roles: UserRole[]) => {
            dispatch(updateUserRoles({ uuid, roles }));
        }, 500),
        [dispatch]
    );
    const searchConfig: SearchConfig<UserAdminView> = useMemo(
        () => ({
            filters: [
                { key: "username", label: "Username", uiType: "text" },
                {
                    key: "roles",
                    label: "Roles",
                    uiType: "selectMultiple",
                    options: [
                        { label: "Admin", value: "admin" },
                        { label: "User", value: "user" },
                    ],
                },
                { key: "createdAtStart", label: "Created At Start", uiType: "datetime" },
                { key: "createdAtEnd", label: "Created At End", uiType: "datetime" },
                { key: "lastLoginStart", label: "Last Login Start", uiType: "datetime" },
                { key: "lastLoginEnd", label: "Last Login End", uiType: "datetime" },
                {
                    key: "isDisabled",
                    label: "Is Disabled",
                    uiType: "selectOne",
                    options: [
                        { label: "All", value: "", default: true },
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                    ],
                },
            ],
            sorting: [
                { key: "firstName", label: "First Name" },
                { key: "lastName", label: "Last Name" },
                { key: "username", label: "Username" },
                { key: "createdAt", label: "Created At" },
                { key: "lastLogin", label: "Last Login" },
                { key: "isDisabled", label: "Is Disabled" },
            ],
            defaultSort: [
                { field: "firstName", direction: "asc" },
                { field: "lastName", direction: "asc" },
            ],
            pageSizes: [10, 20, 50],
            deafultPageSize: 10,
        }),
        []
    );

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h2" component="h2">
                    Users
                </Typography>
                <Tooltip title={isLoadingLatest ? "Refreshing..." : "Reload"}>
                    <span>
                        <IconButton
                            aria-label="reload requests"
                            onClick={reload}
                            disabled={isLoadingLatest}
                            sx={{ color: theme.palette.primary.main }}
                        >
                            {isLoadingLatest ? <Loading size={20} /> : <RefreshIcon />}
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>
            <SearchComponent config={searchConfig} onSearch={doSearch} searchRef={searchRef} />

            {pagination && (
                <Typography component="p" sx={{ mt: 1 }}>
                    There is {pagination.totalItems} number of new user(s) that match the search
                </Typography>
            )}
            <PaginationWithHeader pagination={pagination} onPageChange={handlePageChange} />

            <UserList
                error={error ? "Failed to load user requests." : null}
                retryAction={() => dispatch(searchUsers(initialRequest))}
                isLoading={loading}
                users={users}
                updateRoles={updateRoles}
                userActions={[
                    {
                        label: "Unlock user",
                        variant: "contained",
                        color: "primary",
                        onAction: actionUnlockUser,
                        showAction: (user) => user.isDisabled,
                    },
                    {
                        label: "Lock user",
                        variant: "outlined",
                        color: "error",
                        onAction: actionLockUser,
                        showAction: (user) => !user.isDisabled,
                    },
                    {
                        label: "Force re-login",
                        variant: "outlined",
                        color: "error",
                        onAction: actionUpdateTokenVersion,
                        showAction: (user) => !user.isDisabled,
                    },
                ]}
            />

            <PaginationWithHeader pagination={pagination} onPageChange={handlePageChange} />
        </Box>
    );
};

export default UsersListPage;
