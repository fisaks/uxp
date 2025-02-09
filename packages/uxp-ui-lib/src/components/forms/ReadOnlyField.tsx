import React from 'react';
import { Box, Typography, useTheme, TextField } from '@mui/material';

interface ReadOnlyFieldProps {
    label: string;
    value?: string;
}

const ReadOnlyField: React.FC<ReadOnlyFieldProps> = ({ label, value }) => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                height: 56, // Matches default TextField height
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '4px',
                padding: '10px',
                backgroundColor: theme.palette.background.paper,
            }}
        >
            <Typography variant="caption" color="text.secondary" sx={{ mb: -0.5 }}>
                {label}
            </Typography>
            <Typography variant="body1" color="text.primary" sx={{ mt: 1 }}>
                {value || '—'} {/* Show a dash if the value is empty */}
            </Typography>
        </Box>
    );
};

export default ReadOnlyField;
