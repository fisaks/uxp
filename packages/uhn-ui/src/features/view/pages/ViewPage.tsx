import ViewQuiltIcon from "@mui/icons-material/ViewQuilt";
import { Box, Typography } from "@mui/material";
import { ReloadIconButton } from "@uxp/ui-lib";
import { useState } from "react";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { ViewTileGrid } from "../components/ViewTileGrid";

export const ViewPage = () => {
    const { sendMessageAsync } = useUHNWebSocket();
    const [loading, setLoading] = useState(false);

    const refetch = async () => {
        setLoading(true);
        try {
            await sendMessageAsync("uhn:unsubscribe", { patterns: ["view/*", "state/*", "resource/*"] });
            await sendMessageAsync("uhn:subscribe", { patterns: ["view/*", "state/*", "resource/*"] });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ViewQuiltIcon sx={{ color: "primary.main" }} />
                <Typography variant="h1">Views</Typography>
                <ReloadIconButton isLoading={loading} reload={refetch} />
            </Box>
            <Box mt={2}>
                <ViewTileGrid />
            </Box>
        </Box>
    );
};
