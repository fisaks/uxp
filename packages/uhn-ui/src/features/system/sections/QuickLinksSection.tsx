import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { getUxpWindow } from "@uxp/ui-lib";
import React from "react";

const links = [
    { label: "Blueprints", target: "/blueprints" },
    { label: "Resources", target: "/resources" },
];

export const QuickLinksSection: React.FC = () => {
    const navigate = (path: string) => {
        getUxpWindow()?.navigation.requestBaseNavigation(
            "route",
            "unified-home-network",
            path
        );
    };

    return (
        <Box>
            <Typography variant="subtitle2">Quick links</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                {links.map(link => (
                    <Chip
                        key={link.target}
                        label={link.label}
                        icon={<ChevronRightIcon fontSize="small" />}
                        size="small"
                        variant="outlined"
                        clickable
                        onClick={() => navigate(link.target)}
                    />
                ))}
            </Stack>
        </Box>
    );
};
