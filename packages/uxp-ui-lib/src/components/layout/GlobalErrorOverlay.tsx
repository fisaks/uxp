// GlobalErrorOverlay.tsx
import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface GlobalErrorOverlayProps {
    message: string | string[]
    onRetry?: () => void;
    onCancel?: () => void;
}

export const GlobalErrorOverlay: React.FC<GlobalErrorOverlayProps> = ({ message, onRetry, onCancel }) => {
    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                bgcolor: 'rgba(255,0,0,0.15)',
                zIndex: 1300,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backdropFilter: 'blur(2px)',
            }}
        >
            <Paper sx={{ p: 4, bgcolor: 'error.main', color: 'error.contrastText', textAlign: 'center' }}>
                <ErrorOutlineIcon sx={{ fontSize: 48, mb: 2 }} />
                {Array.isArray(message) ? (
                    message.map((line, idx) => (
                        <Typography key={idx} variant="h6" gutterBottom>
                            {line}
                        </Typography>
                    ))
                ) : (
                    <Typography variant="h6" gutterBottom>
                        {message}
                    </Typography>
                )}
       
                <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button variant="contained" color="primary" onClick={onRetry}>
                        Reload Window
                    </Button>
                    <Button variant="outlined" color="inherit" onClick={onCancel}>
                        Close And Wait
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};


