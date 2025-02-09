import CheckIcon from "@mui/icons-material/Check";
import ErrorIcon from "@mui/icons-material/Error";
import { CircularProgress, IconButton, Snackbar, Tooltip } from "@mui/material";
import { ApiErrorResponse, ErrorCode } from "@uxp/common";
import React, { useEffect, useMemo, useState } from "react";

const ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
    INTERNAL_SERVER_ERROR: "Something went wrong on our end. Please try again later.",
    UNAUTHORIZED: "You are not authorized to perform this action. Please log in and try again.",
    FORBIDDEN: "You do not have the necessary permissions to access this resource.",
    VALIDATION: "One or more fields contain invalid data. Please check and try again.",
    NOT_FOUND: "The requested resource could not be found.",
    INVALID_REFRESH_TOKEN: "Your session has expired or is invalid. Please log in again.",
    RESOURCE_NOT_FOUND: "The requested resource could not be found.",
    PATCH_VERSION_CONFLICT: "Version conflict detected.",
};

type WithActionHandlerProps = {
    withActionLoading?: boolean;
    withActionError?: ApiErrorResponse | null;
    withActionDone?: boolean;
};

export const withActionHandler =
    <T extends object>(WrappedComponent: React.ComponentType<T>): React.FC<T & WithActionHandlerProps> =>
    ({ withActionLoading: isLoading, withActionError: error, withActionDone: done, ...restProps }) => {
        const [showSnackbar, setShowSnackbar] = useState(false);
        const errorMessage = useMemo(() => {
            if (error) {
                return error.errors.map((err) => ERROR_MESSAGES[err.code] || ERROR_MESSAGES["INTERNAL_SERVER_ERROR"]).join("\n");
            }
            return "";
        }, [error]);

        useEffect(() => {
            if (error) {
                setShowSnackbar(true);
            }
        }, [error]);

        return (
            <>
                {isLoading ? (
                    <CircularProgress size={24} />
                ) : done ? (
                    <CheckIcon color="success" />
                ) : error ? (
                    <Tooltip title={errorMessage}>
                        <ErrorIcon color="error" onClick={() => setShowSnackbar(false)} />
                    </Tooltip>
                ) : (
                    <WrappedComponent {...(restProps as T)} />
                )}

                <Snackbar
                    open={showSnackbar}
                    autoHideDuration={5000}
                    onClose={() => setShowSnackbar(false)}
                    message={errorMessage}
                    action={
                        <IconButton size="small" onClick={() => setShowSnackbar(false)}>
                            ❌
                        </IconButton>
                    }
                />
            </>
        );
    };
