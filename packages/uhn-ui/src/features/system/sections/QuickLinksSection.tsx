import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { getUxpWindow, selectCurrentUser } from "@uxp/ui-lib";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";

const links = [
    { label: "Technical", target: "/technical" },
    { label: "Blueprints", target: "/technical/blueprints", adminOnly: true },
    { label: "Upload Blueprint", target: "/technical/blueprints/upload", adminOnly: true },
    { label: "Resources", target: "/technical/resources" },
];

export const QuickLinksSection: React.FC = () => {
    const user = useSelector(selectCurrentUser);
    const isAdmin = user?.roles.includes("admin");
    const visibleLinks = useMemo(() => links.filter(l => !l.adminOnly || isAdmin), [isAdmin]);
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
                {visibleLinks.map(link => (
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
