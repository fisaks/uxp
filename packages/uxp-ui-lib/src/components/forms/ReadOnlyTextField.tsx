import { Box, BoxProps, Typography } from '@mui/material';

type ReadOnlyTextFieldProps = {
    label: string;
    value?: string;
    height?: number; // height of the box
    sx?: BoxProps['sx'];
};
export const ReadOnlyTextField = ({
    label,
    value,
    sx,
    height = 56, // default MUI single-line height
}: ReadOnlyTextFieldProps) => (
    <Box sx={{ position: 'relative', mb: 2, ...(sx ?? {}) }}>
        {/* Floating Label */}
        <Typography
            className='uxp-read-only-text-field-label'
            sx={(theme) => ({
                position: 'absolute',
                top: -7,
                left: 8,
                px: '4px',
                backgroundColor: theme.palette.background.paper,
                fontSize: '0.75rem',
                lineHeight: 1,
                color: theme.palette.text.secondary,
            })}
        >
            {label}
        </Typography>

        {/* Outlined Box */}
        <Box
            sx={{
                border: '1px solid rgba(0, 0, 0, 0.23)',
                borderRadius: '4px',
                padding: '16.5px 14px',
                fontSize: '1rem',
                lineHeight: 1.5,
                minHeight: height,
                whiteSpace: 'pre-wrap', 
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
            }}
        >
            {value || <Box component="span" sx={{ color: 'transparent' }}>.</Box>}
        </Box>
    </Box>
);
