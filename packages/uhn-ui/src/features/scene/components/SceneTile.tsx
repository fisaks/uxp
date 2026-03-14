import { Box, Card, CardActionArea, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { RuntimeScene, RuntimeSceneCommand } from "@uhn/common";
import React from "react";
import { TechnicalDeepLink } from "../../shared/TechnicalDeepLink";
import { TileContent } from "../../shared/TileContent";
import { TileDescriptionPopover } from "../../shared/TileDescriptionPopover";
import { TileInfoPopover } from "../../shared/TileInfoPopover";
import { TilePendingIndicator } from "../../shared/TilePendingIndicator";
import { useSceneCommand } from "../../shared/useSceneCommand";
import { useSceneIconColors } from "../../shared/useSceneIconColors";

type SceneTileProps = {
    scene: RuntimeScene;
    nameOverride?: string;
};

function formatCommandValue(cmd: RuntimeSceneCommand): string {
    switch (cmd.type) {
        case "setDigitalOutput":
            return cmd.value ? "ON" : "OFF";
        case "setAnalogOutput":
            return String(cmd.value);
        case "emitSignal":
            return cmd.value === undefined ? "toggle" : cmd.value ? "ON" : "OFF";
    }
}

export const SceneTile: React.FC<SceneTileProps> = ({ scene, nameOverride }) => {
    const theme = useTheme();
    const { handleClick, pending } = useSceneCommand(scene.id);

    const displayName = nameOverride ?? scene.name ?? scene.id;
    const { IconComponent, iconColor, surfaceColor } = useSceneIconColors(scene.icon, pending, theme);

    return (
        <Card
            variant="outlined"
            sx={{
                position: "relative",
                borderRadius: 3,
                boxShadow: 2,
                height: { xs: "auto", sm: 154 },
                display: "flex",
                flexDirection: "column",
                backgroundColor: surfaceColor,
                transition: "background-color 0.3s, box-shadow 0.2s",
                "&:hover": { boxShadow: 4 },
            }}
        >
            {/* Info icon — top-left */}
            <TileInfoPopover>
                <Typography variant="subtitle2">Scene Details</Typography>
                <Typography variant="body2">ID: {scene.id}</Typography>
                {scene.commands.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="subtitle2">Actions ({scene.commands.length})</Typography>
                        {scene.commands.map((cmd, i) => (
                            <Typography key={i} variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                                <TechnicalDeepLink to={`/technical/resources/${cmd.resourceId}`}>
                                    {cmd.resourceId}
                                </TechnicalDeepLink>
                                {" → "}{formatCommandValue(cmd)}
                            </Typography>
                        ))}
                    </Box>
                )}
            </TileInfoPopover>

            {/* Description icon — top-right */}
            <TileDescriptionPopover description={scene.description} />

            <CardActionArea
                onClick={handleClick}
                disabled={pending}
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    justifyContent: "flex-start",
                    touchAction: "manipulation",
                    transition: "transform 100ms ease, box-shadow 100ms ease",
                    "&:active": { transform: "scale(0.97)", boxShadow: 6 },
                }}
            >
                <TileContent
                    icon={<IconComponent sx={{ fontSize: 40, color: iconColor, transition: "color 0.2s" }} />}
                    displayName={displayName}
                    subtitle={scene.description}
                    stateValues={[]}
                    pt={3.5}
                />
            </CardActionArea>

            <TilePendingIndicator pending={pending} />
        </Card>
    );
};
