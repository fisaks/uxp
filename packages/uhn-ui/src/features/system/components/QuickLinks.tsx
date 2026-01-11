import { Box, Chip, Stack, Typography } from "@mui/material";
import { getUxpWindow } from "@uxp/ui-lib";

import ChevronRightIcon from "@mui/icons-material/ChevronRight";

type QuickLink = {
    label: string;
    target: string;
};

const quickLinks: QuickLink[] = [
    { label: "Blueprints", target: "/blueprints" },
    { label: "Resources", target: "/resources" },
];

export const QuickLinks: React.FC = () => {
    const onNavigate = (path: string) => {
        getUxpWindow()?.navigation.requestBaseNavigation("route", "unified-home-network", path);
    }

    return <Box>
        <Typography variant="subtitle2">Quick links</Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
            {quickLinks.map(link => (
                <Chip
                    key={link.target}
                    label={link.label}
                    icon={<ChevronRightIcon fontSize="small" />}
                    size="small"
                    variant="outlined"
                    clickable
                    sx={{
                        backgroundColor: theme => theme.palette.action.hover,
                        color: theme =>
                            theme.palette.mode === "dark"
                                ? theme.palette.grey[100]
                                : theme.palette.text.primary,
                        fontWeight: 500,

                        "& .MuiChip-icon": {
                            color: theme =>
                                theme.palette.mode === "dark"
                                    ? theme.palette.grey[300]
                                    : theme.palette.text.secondary,
                        },

                        "&:hover": {
                            backgroundColor: theme => theme.palette.action.selected,
                            color: theme => theme.palette.text.primary,
                            transform: "translateY(-1px)",
                        },

                    }}
                    onClick={() => onNavigate(link.target)}
                />
            ))}
        </Stack>
    </Box>
}