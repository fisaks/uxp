import { Alert, Snackbar } from "@mui/material";
import React from "react";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { playerErrorDismissed, selectPlayerError } from "./playerSlice";

export const PlayerErrorSnackbar: React.FC = () => {
    const error = useAppSelector(selectPlayerError);
    const dispatch = useAppDispatch();
    const dismiss = () => dispatch(playerErrorDismissed());
    return (
        <Snackbar open={error !== undefined} autoHideDuration={6000} onClose={dismiss}>
            <Alert severity="error" onClose={dismiss}>
                {error}
            </Alert>
        </Snackbar>
    );
};
