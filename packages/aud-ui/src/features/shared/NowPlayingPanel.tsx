import { alpha, Box, Typography } from "@mui/material";
import React from "react";

type NowPlayingPanelProps = {
    /** The picture at the left: a radio icon for the tuner, the cover for the player. */
    leading: React.ReactNode;
    title: string;
    subtitle?: string;
    /** More lines under the subtitle, such as the radio text. */
    children?: React.ReactNode;
};

/** What is playing, in the coloured panel that the tuner card and the player card of the System Center share. */
export const NowPlayingPanel: React.FC<NowPlayingPanelProps> = ({ leading, title, subtitle, children }) => (
    <Box
        sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            p: 2,
            borderRadius: 1,
            borderLeft: 4,
            borderColor: "primary.main",
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
        }}
    >
        {leading}
        <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                Now playing
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, overflowWrap: "anywhere", lineHeight: 1.2 }}>
                {title}
            </Typography>
            {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
            {children}
        </Box>
    </Box>
);
