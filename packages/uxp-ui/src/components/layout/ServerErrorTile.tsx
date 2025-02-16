import { Alert, Typography } from "@mui/material";
import { ApiErrorResponse, ErrorCode } from "@uxp/common";
import React, { useMemo } from "react";

// Error code to message mapping
const ERROR_MESSAGES: Record<ErrorCode, string> = {
    INTERNAL_SERVER_ERROR: "Something went wrong on our end. Please try again later.",
    UNAUTHORIZED: "You are not authorized to perform this action. Please log in and try again.",
    FORBIDDEN: "You do not have the necessary permissions to access this resource.",
    VALIDATION: "One or more fields contain invalid data. Please check and try again.",
    NOT_FOUND: "The requested resource could not be found.",
    USERNAME_EXISTS: "The username is already in use. Please choose a different one.",
    ALREADY_REGISTERED: "This account is already registered. Please log in.",
    INVALID_USERNAME_PASSWORD: "The username or password you entered is incorrect. Please try again.",
    INVALID_REFRESH_TOKEN: "Your session has expired or is invalid. Please log in again.",
    USER_NOT_FOUND: "The specified user could not be found.",
    USER_OLD_PASSWORD_NOT_MATCH: "The old password you entered is incorrect.",
    RESOURCE_NOT_FOUND: "The requested resource could not be found.",
    PATCH_VERSION_CONFLICT: "Version conflict detected.",
    DISCONNECTED: "You have been disconnected from the server. Please try again later.",
    // Add more error mappings as needed
};

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
                    return <li key={code}>{ERROR_MESSAGES[code] || "Unknown error occurred."}</li>;
                })}
            </ul>
        </Alert>
    );
};

export default ServerErrorTile;
