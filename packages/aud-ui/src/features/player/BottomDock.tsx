import { Box } from "@mui/material";
import React from "react";
import { NoticeStrip } from "./NoticeStrip";
import { NowPlayingBar } from "./NowPlayingBar";

/** The messages and the player bar, stuck together to the bottom of the window, in the column of the app. */
export const BottomDock: React.FC = () => (
    <Box sx={{ position: "sticky", bottom: 0, zIndex: 2, mt: 2 }}>
        <NoticeStrip />
        <NowPlayingBar />
    </Box>
);
