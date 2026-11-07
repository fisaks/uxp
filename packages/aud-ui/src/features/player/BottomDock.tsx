import { Box } from "@mui/material";
import React from "react";
import { selectChromecastActive } from "../chromecast/chromecastSelectors";
import { ChromecastBar } from "../chromecast/ChromecastBar";
import { useAppSelector } from "../../hooks";
import { NoticeStrip } from "./NoticeStrip";
import { NowPlayingBar } from "./NowPlayingBar";

/** The room the dock takes at the bottom of the window, which the page leaves free. */
export const DOCK_ROOM = "calc(96px + env(safe-area-inset-bottom))";

/** The messages and the player bar (the Chromecast bar while the amplifier is on the Chromecast), fixed to the bottom of the window on every page. */
export const BottomDock: React.FC = () => {
    const chromecastActive = useAppSelector(selectChromecastActive);
    return (
        <Box
            sx={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: (theme) => theme.zIndex.appBar,
                px: { xs: 0, md: 2 },
                pb: "env(safe-area-inset-bottom)",
                pointerEvents: "none",
                "& > *": { pointerEvents: "auto" },
            }}
        >
            <Box>
                <NoticeStrip />
                {chromecastActive ? <ChromecastBar /> : <NowPlayingBar />}
            </Box>
        </Box>
    );
};
