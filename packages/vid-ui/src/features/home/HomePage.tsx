import { Box, ButtonBase, Paper, Typography } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";
import { HomeVideoClip } from "@vid/common";
import { thumbnailUrl } from "../../api/home-video-api";
import { MENU_ITEMS } from "../../menu";
import { useGetClipsQuery } from "../home-video/home-video.api";
import { isUnlabelled } from "../home-video/clipFormat";
import { PAGE_WIDTH } from "../shared/pageWidth";

const MOSAIC_SIZE = 88;
const MOSAIC_CLIPS = 4;

/** Poster frames of clips spread over the whole timeline, so the tile shows the years and not only the first ones. */
const MosaicOf: React.FC<{ clips: HomeVideoClip[] }> = ({ clips }) => {
    const step = clips.length / MOSAIC_CLIPS;
    const spread = clips.length < MOSAIC_CLIPS ? clips : Array.from({ length: MOSAIC_CLIPS }, (_, i) => clips[Math.floor(i * step)]);
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2px",
                width: MOSAIC_SIZE,
                height: MOSAIC_SIZE,
                borderRadius: 1,
                overflow: "hidden",
            }}
        >
            {spread.map((clip) => (
                <Box
                    key={clip.id}
                    component="img"
                    src={thumbnailUrl(clip.id)}
                    alt=""
                    loading="lazy"
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            ))}
        </Box>
    );
};

type TileProps = {
    to: string;
    icon: React.ReactElement;
    title: string;
    /** Lines of live information, the first one the most important. */
    lines: (string | undefined)[];
    picture?: React.ReactNode;
};

const Tile: React.FC<TileProps> = ({ to, icon, title, lines, picture }) => (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <ButtonBase
            component={Link}
            to={to}
            sx={{ display: "flex", alignItems: "stretch", width: "100%", minHeight: 112, p: 1.5, gap: 0.5, textAlign: "left" }}
        >
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 0.5 }}>
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
            </Box>
            {picture && <Box sx={{ display: { xs: "none", sm: "block" }, flexShrink: 0, alignSelf: "center" }}>{picture}</Box>}
        </ButtonBase>
    </Paper>
);

const plural = (count: number, one: string) => `${count} ${one}${count === 1 ? "" : "s"}`;

/** The tiles of the places of the app, each with what is in it. */
export const HomePage: React.FC = () => {
    const { data: clips } = useGetClipsQuery();
    const homeVideos = MENU_ITEMS[0];
    const unlabelled = clips?.filter(isUnlabelled).length;
    const info = clips && [plural(clips.length, "clip"), unlabelled ? `${unlabelled} unlabelled` : undefined].filter(Boolean).join(" · ");

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: PAGE_WIDTH, mx: "auto" }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(260px, 1fr))" }, gap: 1.5 }}>
                <Tile
                    to={homeVideos.path}
                    icon={homeVideos.icon}
                    title={homeVideos.label}
                    lines={[info]}
                    picture={clips && clips.length > 0 && <MosaicOf clips={clips} />}
                />
            </Box>
        </Box>
    );
};
