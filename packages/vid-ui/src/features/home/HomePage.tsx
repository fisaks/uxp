import { Box, ButtonBase, Paper, Typography } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";
import { HomeVideoClip } from "@vid/common";
import { thumbnailUrl } from "../../api/home-video-api";
import { MENU_ITEMS } from "../../menu";
import { useAppSelector } from "../../hooks";
import { selectChromecasts } from "../chromecast/chromecastSelectors";
import { useGetClipsQuery } from "../home-video/home-video.api";
import { isUnlabelled } from "../home-video/clipFormat";
import { PAGE_WIDTH } from "../shared/pageWidth";

const MOSAIC_SIZE = 88;
const MOSAIC_CLIPS = 4;

/** Small pictures in a square: one fills it, more share it in two columns. */
const Mosaic: React.FC<{ urls: string[] }> = ({ urls }) => (
    <Box
        sx={{
            display: "grid",
            gridTemplateColumns: urls.length === 1 ? "1fr" : "1fr 1fr",
            gap: "2px",
            width: MOSAIC_SIZE,
            height: MOSAIC_SIZE,
            borderRadius: 1,
            overflow: "hidden",
        }}
    >
        {urls.map((url) => (
            <Box key={url} component="img" src={url} alt="" loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ))}
    </Box>
);

/** Poster frames of clips spread over the whole timeline, so the tile shows the years and not only the first ones. */
const spreadPosters = (clips: HomeVideoClip[]): string[] => {
    const step = clips.length / MOSAIC_CLIPS;
    const spread = clips.length < MOSAIC_CLIPS ? clips : Array.from({ length: MOSAIC_CLIPS }, (_, i) => clips[Math.floor(i * step)]);
    return spread.map((clip) => thumbnailUrl(clip.id));
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
    const chromecastsTile = MENU_ITEMS[1];
    const chromecasts = useAppSelector(selectChromecasts)?.devices;
    const casting = chromecasts?.filter((device) => device.playback && device.playback.state !== "IDLE").length;
    const chromecastInfo =
        chromecasts && [`${chromecasts.length} found`, casting ? `${casting} casting` : undefined].filter(Boolean).join(" · ");
    // Our own clips show their poster frame from the library; what others cast shows the art the device reports.
    const castArt = [
        ...new Set(
            chromecasts
                ?.filter((device) => device.playback && device.playback.state !== "IDLE")
                .map(({ playback }) => (playback?.clipId ? thumbnailUrl(playback.clipId) : playback?.imageUrl))
                .filter((url): url is string => !!url)
        ),
    ].slice(0, MOSAIC_CLIPS);
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
                    picture={clips && clips.length > 0 && <Mosaic urls={spreadPosters(clips)} />}
                />
                <Tile
                    to={chromecastsTile.path}
                    icon={chromecastsTile.icon}
                    title={chromecastsTile.label}
                    lines={[chromecastInfo]}
                    picture={castArt.length > 0 && <Mosaic urls={castArt} />}
                />
            </Box>
        </Box>
    );
};
