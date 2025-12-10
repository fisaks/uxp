import { Alert, Typography } from "@mui/material";
import { ApiErrorResponse, ErrorCode, ErrorMessages } from "@uxp/common";
import React, { useMemo } from "react";

// Error code to message mapping


type ServerErrorTileProps = {
    apiError: ApiErrorResponse; // Array of error codes
};

export const ServerErrorTile: React.FC<ServerErrorTileProps> = ({ apiError }) => {
    const errorCodes = useMemo(() => apiError.errors.map((e) => e.code), [apiError]);

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
                {errorCodes.map((code) => {
                    return <li key={code}>{ErrorMessages[code] || "Unknown error occurred."}</li>;
                })}
            </ul>
        </Alert>
    );
};

export default ServerErrorTile;
