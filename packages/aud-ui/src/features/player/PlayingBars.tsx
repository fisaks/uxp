import React from "react";
import { Box, keyframes } from "@mui/material";

// Same five bars as the graphic equaliser icon: the resting shape is a diamond, tall in the middle, short at the edges.
const BARS = [
    { x: 3, height: 4, duration: 0.9, delay: 0.15 },
    { x: 7, height: 12, duration: 0.7, delay: 0.4 },
    { x: 11, height: 20, duration: 1.1, delay: 0 },
    { x: 15, height: 12, duration: 0.8, delay: 0.25 },
    { x: 19, height: 4, duration: 1, delay: 0.5 },
];
const BAR_WIDTH = 2;
const VIEW_SIZE = 24;
const CENTER = VIEW_SIZE / 2;

const bounce = keyframes({
    "0%, 100%": { transform: "scaleY(1)" },
    "50%": { transform: "scaleY(0.25)" },
});

type PlayingBarsProps = {
    /** The bars bounce while playing and rest as the diamond when paused. */
    playing: boolean;
    marginX?: number;
};

export const PlayingBars: React.FC<PlayingBarsProps> = ({ playing, marginX }) => (
    <Box
        component="svg"
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        aria-hidden
        sx={{ width: "1.25rem", height: "1.25rem", flexShrink: 0, mx: marginX, fill: "currentColor", color: "primary.main" }}
    >
        {BARS.map((bar) => (
            <Box
                key={bar.x}
                component="rect"
                x={bar.x}
                y={CENTER - bar.height / 2}
                width={BAR_WIDTH}
                height={bar.height}
                sx={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    animation: playing ? `${bounce} ${bar.duration}s ease-in-out ${bar.delay}s infinite` : "none",
                    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                }}
            />
        ))}
    </Box>
);
