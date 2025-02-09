import { CheckCircleOutline } from "@mui/icons-material";
import ErrorIcon from "@mui/icons-material/Error";
import { Box, Button, CircularProgress, IconButton, Popover, Tooltip, Typography, useTheme } from "@mui/material";
import { AsyncThunk, ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import React, { MouseEventHandler, useEffect, useMemo, useRef, useState } from "react";
import { useThunkHandler } from "../../features/loading-error/useThunkHandler";

type ActionIconButtonProps<Returned, Payload, RootState> = {
    thunk: AsyncThunk<Returned, Payload, {}>;
    dispatch: ThunkDispatch<RootState, unknown, UnknownAction>;
    payload?: Payload;
    confirmMessage?: string;
    successDuration?: number;
    errorDuration?: number;
    tooltip?: string;

    children: React.ReactNode;

}
export const ActionIconButton = <Returned, Payload = void, RootState = any>
    ({ thunk, dispatch, payload, successDuration, errorDuration, confirmMessage, children, tooltip }
        : ActionIconButtonProps<Returned, Payload, RootState>) => {
    const [trigger, isLoading, error, done] = useThunkHandler(
        thunk,
        dispatch,
        successDuration
    );
    const theme = useTheme()
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const drawerRootRef = useRef<HTMLDivElement>(null);

    const [errorAnchorEl, setErrorAnchorEl] = useState<HTMLElement | null>(null);
    const [confirmAnchorEl, setConfirmAnchorEl] = useState<HTMLElement | null>(null);

    const errorMessage = useMemo(() => {
        if (error) {
            return "An error occurred";
        }
        return "";
    }, [error]);

    useEffect(() => {
        if (error && buttonRef.current) {
            setErrorAnchorEl(buttonRef.current);
            const timer = setTimeout(() => setErrorAnchorEl(null), errorDuration ?? 5000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [error]);

    const handleActionClick = (event: React.MouseEvent<HTMLElement>) => {
        if (!!confirmMessage) {
            setConfirmAnchorEl(event.currentTarget);
        } else {
            trigger(payload as Payload);
        }
        event.stopPropagation();
    };

    const handleConfirmClose: MouseEventHandler<HTMLButtonElement> = (event) => {
        setConfirmAnchorEl(null);
        event.stopPropagation();
    };
    const handleConfirmContinue: MouseEventHandler<HTMLButtonElement> = (event) => {
        trigger(payload as Payload);
        handleConfirmClose(event);
    };
    const closeErrorMessage:MouseEventHandler<HTMLElement>= (event) => {
        setErrorAnchorEl(null);
        event.stopPropagation();
    };


    return <div ref={drawerRootRef}>
        <Tooltip title={tooltip}
            slotProps={{ popper: { container: drawerRootRef.current } }}
        >
            <IconButton disabled={isLoading || done} ref={buttonRef} onClick={handleActionClick}
                sx={{
                    "&:disabled": {
                        color: done ? "success.main" : "inherit", // Change text color to success.main when done
                    },
                }}>
                {isLoading ? (
                    <CircularProgress size={24} />
                ) : done ? (
                    <CheckCircleOutline color="success" />
                ) : (
                    children
                )}

            </IconButton>
        </Tooltip>

        <Popover
            container={drawerRootRef.current}
            open={Boolean(confirmAnchorEl)}
            anchorEl={confirmAnchorEl}
            onClose={handleConfirmClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}>
            <Box sx={{ padding: 2, backgroundColor: theme.palette.background.paper }}>
                <Typography variant="body1">{confirmMessage}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button onClick={handleConfirmClose} sx={{ mr: 1 }}>No</Button>
                    <Button onClick={handleConfirmContinue} sx={{ color: theme.palette.error.main }}>
                        Yes
                    </Button>
                </Box>
            </Box>
        </Popover>
        <Popover
            container={drawerRootRef.current}
            open={Boolean(errorAnchorEl)}
            anchorEl={errorAnchorEl}
            onClose={closeErrorMessage}
            anchorOrigin={{
                vertical: "top",
                horizontal: "center",
            }}
            transformOrigin={{
                vertical: "top",
                horizontal: "center",
            }}
            disableAutoFocus
            disableEnforceFocus
        >
            <Typography
                variant="body2"
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    backgroundColor: "error.main",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",

                }}
                onClick={closeErrorMessage}
            >
                <ErrorIcon fontSize="small" />
                {errorMessage ?? "An error occurred"}
            </Typography>
        </Popover>

    </div >;
}
