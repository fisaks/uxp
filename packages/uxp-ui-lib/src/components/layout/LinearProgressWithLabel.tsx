import { Box, LinearProgress, Typography } from '@mui/material';
import React from 'react';

interface LinearProgressWithLabelProps {
    value: number; // 0–100
    label?: string; // Optional label like "Uploading"
    speed?: number; // Bytes per second
}

function formatSpeed(speed?: number): string {
    if (speed==undefined || speed < 0) return '';
    const kb = speed / 1024;
    const mb = kb / 1024;
    return mb >= 1 ? `${mb.toFixed(1)} MB/s` : `${kb.toFixed(0)} KB/s`;
}

const LinearProgressWithLabel: React.FC<LinearProgressWithLabelProps> = ({ value, label, speed }) => {
    const parts = [];

    if (label) parts.push(label);
    parts.push(`${Math.round(value)}%`);

    const speedText = formatSpeed(speed);
    if (speedText) parts.push(`– ${speedText}`);

    return (
        <Box display="flex" alignItems="center" gap={1}>
            <Box flexGrow={1}>
                <LinearProgress variant="determinate" value={value} />
            </Box>
            <Box minWidth={80}>
                <Typography variant="body2" color="text.secondary">
                    {parts.join(' ')}
                </Typography>
            </Box>
        </Box>
    );
};

export default LinearProgressWithLabel;
