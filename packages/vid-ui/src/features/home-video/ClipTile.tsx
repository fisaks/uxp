import { Box, ButtonBase, Typography } from "@mui/material";
import { HomeVideoClip } from "@vid/common";
import React from "react";
import { Link } from "react-router-dom";
import { thumbnailUrl } from "../../api/home-video-api";
import { HOME_VIDEOS_PATH } from "../../menu";
import { clipName, formatDate, formatDuration } from "./clipFormat";

export const clipPath = (id: string) => `${HOME_VIDEOS_PATH}/clips/${id}`;

/** A poster frame with the length of the clip, and under it what the clip is called and when it was filmed. */
export const ClipTile: React.FC<{ clip: HomeVideoClip }> = ({ clip }) => (
    <ButtonBase
        component={Link}
        to={clipPath(clip.id)}
        sx={{
            display: "block",
            textAlign: "left",
            width: "100%",
            "&:hover .poster, &:focus-visible .poster": { boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}` },
            "&:hover img, &:focus-visible img": { transform: "scale(1.04)" },
        }}
    >
        <Box
            className="poster"
            sx={{
                position: "relative",
                transition: "box-shadow 0.15s",
                aspectRatio: "16 / 9",
                bgcolor: "action.hover",
                borderRadius: 1,
                overflow: "hidden",
            }}
        >
            <Box
                component="img"
                src={thumbnailUrl(clip.id)}
                alt=""
                loading="lazy"
                sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.2s" }}
            />
            <Typography
                variant="caption"
                sx={{
                    position: "absolute",
                    right: 4,
                    bottom: 4,
                    px: 0.75,
                    borderRadius: 0.5,
                    bgcolor: "rgba(0, 0, 0, 0.7)",
                    color: "common.white",
                }}
            >
                {formatDuration(clip.durationSeconds)}
            </Typography>
        </Box>
        <Typography variant="body2" noWrap sx={{ mt: 0.5 }}>
            {clipName(clip)}
        </Typography>
        {clip.title && clip.date && (
            <Typography variant="caption" color="text.secondary" noWrap component="div">
                {formatDate(clip.date)}
            </Typography>
        )}
    </ButtonBase>
);
