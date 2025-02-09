import CheckIcon from "@mui/icons-material/Check";
import ErrorIcon from "@mui/icons-material/Error";
import { CircularProgress, Popover, Tooltip } from "@mui/material";
import type { AsyncThunk, ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useThunkHandler } from "./useThunkHandler";
import { ErrorCode } from "@uxp/common";

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

interface ActionWrapperProps<Returned, Payload, RootState> {
    thunk: AsyncThunk<Returned, Payload, {}>;
    dispatch: ThunkDispatch<RootState, unknown, UnknownAction>;
    payload?: Payload;
    successDuration?: number;
    children: React.ReactNode;
}
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
const ActionWrapper = <Returned, Payload = void, RootState = any>({
    thunk,
    dispatch,
    payload,
    successDuration = 2000,
    children,
}: ActionWrapperProps<Returned, Payload, RootState>) => {
    const [trigger, isLoading, error, done] = useThunkHandler(thunk, dispatch, successDuration);

    const actionRef = useRef<HTMLSpanElement | null>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [hasError, setHasError] = useState(false);

    const errorMessage = useMemo(() => {
        if (error) {
            return error.errors.map((err) => ERROR_MESSAGES[err.code] || ERROR_MESSAGES["INTERNAL_SERVER_ERROR"]).join("\n");
        }
        return "";
    }, [error]);

    useEffect(() => {
        if (error && actionRef.current) {
            setHasError(true);
            setAnchorEl(actionRef.current);
        }
    }, [error]);

    const closePopover = () => {
        setAnchorEl(null);
        setHasError(false);
    };

    return (
        <>
            <span ref={actionRef} onClick={() => trigger(payload as Payload)}>
                {isLoading ? (
                    <CircularProgress size={24} />
                ) : done ? (
                    <CheckIcon color="success" />
                ) : hasError ? (
                    <Tooltip title="Click to dismiss">
                        <ErrorIcon color="error" onClick={closePopover} />
                    </Tooltip>
                ) : (
                    children
                )}
            </span>

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={closePopover}
                anchorOrigin={{
                    vertical: "top",
                    horizontal: "center",
                }}
                transformOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                }}
            >
                <div style={{ padding: "8px 16px", color: "red", fontSize: "14px" }}>{errorMessage}</div>
            </Popover>
        </>
    );
};
