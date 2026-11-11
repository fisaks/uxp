import { Alert, Typography } from "@mui/material";
import { ApiErrorResponse } from "@uxp/common";
import { mapApiErrorCodeToMessage } from "@uxp/ui-lib";
import React, { useMemo } from "react";

// Error code to message mapping


type ServerErrorTileProps = {
    apiError: ApiErrorResponse; // Array of error codes
};

export const ServerErrorTile: React.FC<ServerErrorTileProps> = ({ apiError }) => {
    const errors = useMemo(() => apiError.errors, [apiError]);

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
            <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                {errors.map((error) => (
                    <li key={error.code}>{mapApiErrorCodeToMessage(error.code, undefined, error.params)}</li>
                ))}
            </ul>
        </Alert>
    );
};

export default ServerErrorTile;
