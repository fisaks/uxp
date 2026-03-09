import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, Card, CardActionArea, CircularProgress, IconButton, Popover, Tooltip, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { RuntimeScene, RuntimeSceneCommand } from "@uhn/common";
import React, { useCallback, useState } from "react";
import { useSceneIconColors } from "../../shared/useSceneIconColors";
import { useSceneCommand } from "../../shared/useSceneCommand";
import { createTooltipProps } from "../../shared/tileEventHelpers";
import { TileContent } from "../../shared/TileContent";

type SceneTileProps = {
    scene: RuntimeScene;
    nameOverride?: string;
};

function formatCommand(cmd: RuntimeSceneCommand): string {
    switch (cmd.type) {
        case "setDigitalOutput":
            return `${cmd.resourceId} → ${cmd.value ? "ON" : "OFF"}`;
        case "setAnalogOutput":
            return `${cmd.resourceId} → ${cmd.value}`;
        case "emitSignal":
            return `${cmd.resourceId} → ${cmd.value === undefined ? "toggle" : cmd.value ? "ON" : "OFF"}`;
    }
}

export const SceneTile: React.FC<SceneTileProps> = ({ scene, nameOverride }) => {
    const theme = useTheme();
    const portalContainer = usePortalContainerRef();
    const { handleClick, pending } = useSceneCommand(scene.id);
    const [infoAnchor, setInfoAnchor] = useState<null | HTMLElement>(null);

    const displayName = nameOverride ?? scene.name ?? scene.id;
    const { IconComponent, iconColor, surfaceColor } = useSceneIconColors(scene.icon, pending, theme);
    const tooltipProps = createTooltipProps(portalContainer.current);

    const handleInfoClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setInfoAnchor(e.currentTarget);
    }, []);

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
            <Box sx={{ position: "absolute", top: 6, left: 6, zIndex: 2, pointerEvents: "auto" }}>
                <Tooltip title="Technical info" {...tooltipProps}>
                    <IconButton size="small" onClick={handleInfoClick} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                        <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                    </IconButton>
                </Tooltip>
                <Popover
                    open={!!infoAnchor}
                    anchorEl={infoAnchor}
                    onClose={() => setInfoAnchor(null)}
                    container={portalContainer.current}
                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                >
                    <Box sx={{ p: 2, minWidth: 200 }}>
                        <Typography variant="subtitle2">Scene Details</Typography>
                        <Typography variant="body2">ID: {scene.id}</Typography>
                        {scene.commands.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                                <Typography variant="subtitle2">Actions ({scene.commands.length})</Typography>
                                {scene.commands.map((cmd, i) => (
                                    <Typography key={i} variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                                        {formatCommand(cmd)}
                                    </Typography>
                                ))}
                            </Box>
                        )}
                    </Box>
                </Popover>
            </Box>

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

            {pending && (
                <CircularProgress size={16} thickness={5} sx={{ position: "absolute", bottom: 11, right: 11 }} />
            )}
        </Card>
    );
};
