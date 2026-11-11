import { Alert, Typography } from "@mui/material";
import { ApiErrorResponse } from "@uxp/common";
import { mapApiErrorCodeToMessage } from "@uxp/ui-lib";
import React from "react";

// Error code to message mapping


type ServerErrorTileProps = {
    apiError: ApiErrorResponse;
};

export const ServerErrorTile: React.FC<ServerErrorTileProps> = ({ apiError }) => {
    return (
        <Alert
            severity="error"
            sx={{ mb: 2 }}
            role="alert" // Marks this as a live region for assistive technologies
            aria-live="assertive" // Ensures screen readers announce it immediately
        >
            <Typography variant="h6" component="h2" tabIndex={-1} sx={{ fontWeight: "bold", mb: 1 }}>
                An error occurred
            </Typography>
            <Typography variant="body2">{mapApiErrorCodeToMessage(apiError.error.code, undefined, apiError.error.params)}</Typography>
        </Alert>
    );
};

export default ServerErrorTile;
