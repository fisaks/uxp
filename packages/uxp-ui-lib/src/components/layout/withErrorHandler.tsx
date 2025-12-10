import { Box, Button, Typography } from "@mui/material";
import { ApiErrorResponse } from "@uxp/common";
import React from "react";
import { ErrorCodeMessageMap, extractErrorCodeResponse, extractSerializedError, isErrorCodeResponse, mapApiErrorsToMessageString } from "../../util/browserErrorMessage";
import { SerializedError } from "@reduxjs/toolkit";

type WithErrorHandlerProps = {
    error?: string | ApiErrorResponse | SerializedError | null;
    errorOverrides?: ErrorCodeMessageMap
    retryAction?: () => void;
};

export const withErrorHandler = <T extends object>(WrappedComponent: React.ComponentType<T>): React.FC<T & WithErrorHandlerProps> => {
    const ComponentWithErrorHandler: React.FC<T & WithErrorHandlerProps> = ({ error, errorOverrides, retryAction, ...props }) => {
        if (error) {
            const apiError = extractErrorCodeResponse(error)
            const sError = extractSerializedError(error);
            const sMesseage= !apiError && !sError && typeof error === 'string' ? error : "An error occurred.";
            return (
                <Box sx={{ textAlign: "center", mt: 4 }}>
                    <Typography color="error" sx={{ mb: 2 }}>
                        {apiError && mapApiErrorsToMessageString(apiError,errorOverrides)}
                        {sError && sError.message}
                        {!apiError && !sError && sMesseage}
                    </Typography>
                    {retryAction && (
                        <Button variant="outlined" onClick={retryAction}>
                            Retry
                        </Button>
                    )}
                </Box>
            );
        }

        return <WrappedComponent {...(props as T)} />;
    };

    return ComponentWithErrorHandler;
};
