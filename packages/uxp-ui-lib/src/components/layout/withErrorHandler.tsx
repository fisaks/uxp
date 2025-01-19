import { Box, Button, Typography } from "@mui/material";
import React from "react";

type WithErrorHandlerProps = {
    error?: string | null;
    retryAction?: () => void;
};

export const withErrorHandler = <T extends object>(
    WrappedComponent: React.ComponentType<T>
): React.FC<T & WithErrorHandlerProps> => {
    const ComponentWithErrorHandler: React.FC<T & WithErrorHandlerProps> = ({ error, retryAction, ...props }) => {
        if (error) {
            return (
                <Box sx={{ textAlign: "center", mt: 4 }}>
                    <Typography color="error" sx={{ mb: 2 }}>
                        {error || "An error occurred."}
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
