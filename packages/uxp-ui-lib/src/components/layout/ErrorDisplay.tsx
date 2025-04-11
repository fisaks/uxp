import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, Button, Typography } from '@mui/material';
import React from 'react';

type ErrorDisplayProps = {
    message?: string;
    onRetry?: () => void;
    retryLabel?: string;
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
    message = 'Something went wrong.',
    onRetry,
    retryLabel = 'Try Again',
}) => {
    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            padding={4}
            gap={2}
        >
            <ErrorOutlineIcon color="error" sx={{ fontSize: 48,color: 'error.main' }} />

            <Typography variant="h6" color="text.secondary">
                {message}
            </Typography>

            {onRetry && (
                <Button variant="contained" color="error" onClick={onRetry}>
                    {retryLabel}
                </Button>
            )}
        </Box>
    );
};


