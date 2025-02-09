import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, IconButton, Tooltip, Typography, useTheme } from "@mui/material";
import { UserSearchRequest } from "@uxp/common";
import { Loading } from "@uxp/ui-lib";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../../hooks";
import { handleThunkResult } from "../../../utils/thunkUtils";
import { selectError } from "../../error/errorSelectors";
import { selectIsLoading } from "../../loading/loadingSelectors";
import { selectUserSearchPagination, selectUserSearchResult } from "../adminUserManagementSelectors";
import { removeUserFromList } from "../adminUserManagementSlice";
import { lockUser, searchUsers, updateUserRoles } from "../adminUserManagementThunk";
import PaginationWithHeader from "../componenets/PaginationWithHeader";
import UserList from "../componenets/UserList";


const initialRequest: UserSearchRequest = {
    pagination: { page: 1, size: 10 },
    filters: [{ field: "roles", operator: "eq", value: "" }, { field: "isDisabled", operator: "eq", value: false }],
    sort: [{ field: "createdAt", direction: "asc" }],
};

const NewUserRequestsPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const users = useSelector(selectUserSearchResult);
    const loading = useSelector(selectIsLoading("user/search"));
    const error = useSelector(selectError("user/search"));
    const pagination = useSelector(selectUserSearchPagination);
    const theme = useTheme();
    const isLoadingLatest = useSelector(selectIsLoading("user/search"));

    useEffect(() => {
        dispatch(searchUsers(initialRequest));
    }, [dispatch]);

    const reload = () => {
        dispatch(searchUsers(initialRequest));
    }
    const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
        dispatch(searchUsers({ ...initialRequest, pagination: { ...initialRequest.pagination, page } }));
    };

    const handleApprove = (uuid: string, onDone: () => void) => {
        dispatch(updateUserRoles({ uuid, roles: ["user"] })).then(handleThunkResult(() => {
            dispatch(removeUserFromList({ uuid }));
        }, undefined, () => {
            onDone();
        }));
    };

    const handleReject = (uuid: string, onDone: () => void) => {
        dispatch(lockUser({ uuid })).then(handleThunkResult(() => {
            dispatch(removeUserFromList({ uuid }));
        }, undefined, () => {
            console.log("onDone");
            onDone();
        }));
    };

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h2" component="h2">
                    New User Requests
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

            {pagination && <Typography component="p" sx={{ mt: 1 }}>
                There is {pagination.totalItems} number of new user requests
            </Typography>}
            <PaginationWithHeader pagination={pagination} onPageChange={handlePageChange} />

            <UserList
                error={error ? "Failed to load user requests." : null}
                retryAction={() => dispatch(searchUsers(initialRequest))}
                isLoading={loading}
                users={users}
                userActions={[
                    {
                        label: "Approve user",
                        variant: "contained",
                        color: "primary",
                        onAction: handleApprove,
                    },
                    {
                        label: "Reject user",
                        variant: "outlined",
                        color: "error",
                        onAction: handleReject,
                    },
                ]}
            />

            <PaginationWithHeader pagination={pagination} onPageChange={handlePageChange} />

        </Box>
    );
};

export default NewUserRequestsPage;