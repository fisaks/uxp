import { Box, Typography } from "@mui/material";
import { UxpTheme } from "@uxp/ui-lib";
import React from "react";
import { VideoSystemBrowserWebSocketManager } from "./app/VideoBrowserWebSocketManager";
import { CastErrorNotice, CastRows } from "./features/cast/CastBar";
import { CastProvider } from "./features/cast/CastProvider";
import { useCast } from "./features/cast/useCast";

const getWebSocket = () => VideoSystemBrowserWebSocketManager.getInstance();

const Casts: React.FC = () => {
    const sessionCount = useCast().state?.sessions.length ?? 0;
    return (
        <Box sx={{ p: 1.5 }}>
            {sessionCount === 0 ? <Typography color="text.secondary">Nothing is casting</Typography> : <CastRows compact={true} />}
            <CastErrorNotice />
        </Box>
    );
};

/** The Video tab of the System Center: what the Chromecasts play, with the buttons for them, in the narrow drawer. */
const VidSystem: React.FC = () => (
    <UxpTheme>
        <CastProvider getWebSocket={getWebSocket}>
            <Casts />
        </CastProvider>
    </UxpTheme>
);

export default VidSystem;
