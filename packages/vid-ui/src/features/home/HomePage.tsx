import { Box, ButtonBase, Paper, Typography } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";
import { MENU_ITEMS } from "../../menu";
import { useHomeVideos } from "../home-video/HomeVideosProvider";
import { isUnlabelled } from "../home-video/clipFormat";
import { PAGE_WIDTH } from "../shared/pageWidth";

type TileProps = {
    to: string;
    icon: React.ReactElement;
    title: string;
    /** Lines of live information, the first one the most important. */
    lines: (string | undefined)[];
};

const Tile: React.FC<TileProps> = ({ to, icon, title, lines }) => (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <ButtonBase
            component={Link}
            to={to}
            sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "space-between", width: "100%", minHeight: 112, p: 1.5, gap: 0.5, textAlign: "left" }}
        >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "primary.main" }}>
                {icon}
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {title}
                </Typography>
            </Box>
            <Box>
                {lines.filter(Boolean).map((line, index) => (
                    <Typography key={index} variant="body2" color={index === 0 ? "text.primary" : "text.secondary"} noWrap>
                        {line}
                    </Typography>
                ))}
            </Box>
        </ButtonBase>
    </Paper>
);

const plural = (count: number, one: string) => `${count} ${one}${count === 1 ? "" : "s"}`;

/** The tiles of the places of the app, each with what is in it. */
export const HomePage: React.FC = () => {
    const { clips } = useHomeVideos();
    const homeVideos = MENU_ITEMS[0];
    const unlabelled = clips?.filter(isUnlabelled).length;
    const info = clips && [plural(clips.length, "clip"), unlabelled ? `${unlabelled} unlabelled` : undefined].filter(Boolean).join(" · ");

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: PAGE_WIDTH, mx: "auto" }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(260px, 1fr))" }, gap: 1.5 }}>
                <Tile to={homeVideos.path} icon={homeVideos.icon} title={homeVideos.label} lines={[info]} />
            </Box>
        </Box>
    );
};
