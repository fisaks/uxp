import { Box, Paper } from "@mui/material";

type EditorStatusNoticeProps = {
    notice?: string
}
export const EditorStatusNotice = ({ notice }: EditorStatusNoticeProps) => {
    return notice ? (
        <Box
            sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 10,
                pointerEvents: 'none', // 🔥 allows interaction to pass through
                userSelect: 'none',
                opacity: 0.95,
            }}
        >
            <Paper
                elevation={4}
                sx={{
                    px: 2,
                    py: 1,
                    backgroundColor: 'warning.main',
                    color: 'warning.contrastText',
                    borderRadius: 1,
                    fontSize: '0.875rem',
                    pointerEvents: 'none', // 🔥 ensure nested content doesn’t capture focus either
                }}
            >
                {notice}
            </Paper>
        </Box>)

        : null;
}