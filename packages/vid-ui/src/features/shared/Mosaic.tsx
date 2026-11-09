import { Box } from "@mui/material";
import React from "react";

const MOSAIC_SIZE = 88;

/** Small pictures in a square: one fills it, more share it in two columns. */
export const Mosaic: React.FC<{ urls: string[] }> = ({ urls }) => (
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
