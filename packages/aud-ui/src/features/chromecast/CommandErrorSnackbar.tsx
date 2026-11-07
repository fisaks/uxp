import { Alert, Snackbar } from "@mui/material";
import React from "react";

type CommandErrorSnackbarProps = {
    error: string | undefined;
    onClose: () => void;
};

/** Tells why a command to the Chromecast failed. */
export const CommandErrorSnackbar: React.FC<CommandErrorSnackbarProps> = ({ error, onClose }) => (
    <Snackbar open={error !== undefined} autoHideDuration={6000} onClose={onClose}>
        <Alert severity="error" onClose={onClose}>
            {error}
        </Alert>
    </Snackbar>
);
