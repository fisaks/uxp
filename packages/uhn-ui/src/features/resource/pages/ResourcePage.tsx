
import { Box, Typography } from "@mui/material"
import { ReloadIconButton } from "@uxp/ui-lib"
import { useState } from "react"
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager"
import { ResourceTileGrid } from "../components/ResourceTileGrid"

export const ResourcePage = () => {
    const { sendMessageAsync } = useUHNWebSocket()
    const [loading, setLoading] = useState(false);

    const refetch = async () => {
        setLoading(true);
        try {
            await sendMessageAsync("uhn:unsubscribe", { patterns: ["resource/*", "state/*"] })
            await sendMessageAsync("uhn:subscribe", { patterns: ["resource/*", "state/*"] })
        } finally {
            setLoading(false);
        }
    }

    return <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h1">Resources</Typography>
            <ReloadIconButton isLoading={loading} reload={refetch} />

        </Box>
        <Box mt={2} >
            <ResourceTileGrid />
        </Box>
    </Box >
}