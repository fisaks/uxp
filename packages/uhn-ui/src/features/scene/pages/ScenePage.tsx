import { Box, Grid2, Typography } from "@mui/material";
import { ReloadIconButton } from "@uxp/ui-lib";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { SceneTile } from "../components/SceneTile";
import { selectAllScenes } from "../sceneSelectors";

export const ScenePage = () => {
    const { sendMessageAsync } = useUHNWebSocket();
    const scenes = useSelector(selectAllScenes);
    const [loading, setLoading] = useState(false);

    const refetch = async () => {
        setLoading(true);
        try {
            await sendMessageAsync("uhn:unsubscribe", { patterns: ["scene/*"] });
            await sendMessageAsync("uhn:subscribe", { patterns: ["scene/*"] });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h1">Scenes</Typography>
                <ReloadIconButton isLoading={loading} reload={refetch} />
            </Box>
            <Box mt={2}>
                {scenes.length > 0 ? (
                    <Grid2 container spacing={2} sx={{ width: "100%", margin: 0 }}>
                        {scenes.map(scene => (
                            <Grid2 key={scene.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                <SceneTile scene={scene} />
                            </Grid2>
                        ))}
                    </Grid2>
                ) : (
                    <Typography color="text.secondary">
                        No scenes defined. Add scenes to your blueprint in src/scenes/.
                    </Typography>
                )}
            </Box>
        </Box>
    );
};
