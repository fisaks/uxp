import { Box } from "@mui/material";
import React from "react";
import { SPOTIFY_GREEN } from "./AlbumCover";

/** Tells that a track is Spotify's, in the green of its cover banner. */
export const SpotifyMark: React.FC = () => (
    <Box
        component="span"
        sx={{ bgcolor: SPOTIFY_GREEN, color: "#000", fontWeight: 700, fontSize: "0.65rem", px: 0.5, mr: 0.75, borderRadius: 0.5, textTransform: "uppercase" }}
    >
        Spotify
    </Box>
);
