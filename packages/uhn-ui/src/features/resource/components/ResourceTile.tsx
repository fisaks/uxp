import ErrorIcon from "@mui/icons-material/Error";
import { Box, Chip, Popover } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Theme, useTheme } from "@mui/material/styles";
import { ResourceType } from "@uhn/blueprint";
import { RuntimeResourceBase, RuntimeResourceState } from "@uhn/common";
import React, { useState } from "react";
import { ResourceActionButton } from "./ResourceActionButton";
import { getInputIcon, getOutputIcon } from "./icons";
import { usePortalContainerRef } from "@uxp/ui-lib";

// Utility to get color for icon based on state/errors/theme
type TileRuntimeResource = RuntimeResourceBase<ResourceType> & { outputKind?: string, inputKind?: string };
type TileRuntimeResourceState = Pick<RuntimeResourceState, "value" | "timestamp">

function useResourceIconColor(theme: Theme, resource: TileRuntimeResource, state: TileRuntimeResourceState | undefined) {

    if (resource.errors && resource.errors.length > 0) return theme.palette.error.main;
    if (!state) return theme.palette.text.disabled;
    if (resource.type === "digitalOutput") return state.value ? theme.palette.success.main : theme.palette.text.disabled;
    if (resource.type === "digitalInput") return state.value ? theme.palette.info.main : theme.palette.text.disabled;
    return theme.palette.text.disabled;
}

type ReactTileProps = {
    resource: TileRuntimeResource;
    state?: TileRuntimeResourceState;
};

// Individual tile/card component
export const ResourceTile = ({ resource, state }: ReactTileProps) => {

    const theme = useTheme();
    const portalContainer = usePortalContainerRef();
    const iconColor = useResourceIconColor(theme, resource, state);
    const [infoAnchor, setInfoAnchor] = useState<null | HTMLElement>(null);
    const handleInfoClick = (e: React.MouseEvent) => setInfoAnchor(e.target as HTMLElement);
    const handleInfoClose = () => setInfoAnchor(null);
    const infoOpen = Boolean(infoAnchor);
    // Prefer outputKind or inputKind icon, fallback if unknown
    let mainIcon =
        resource.type === "digitalOutput"
            ? getOutputIcon(resource.outputKind)
            : getInputIcon(resource.inputKind);

    return (
        <Card variant="outlined"
            sx={{
                minHeight: 180, display: "flex", flexDirection: "column", alignItems: "center",
            }}
        >
            <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", pt: 2 }}>

                <Box sx={{ position: "relative", mb: 1 }}>
                    <Box sx={{ position: "relative", mb: 1, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>


                        <IconButton
                            size="small"
                            sx={{
                                bgcolor: "background.paper",
                                color: iconColor,
                                border: 2,
                                borderColor: "divider",
                                mb: 1,
                                "&:hover": { bgcolor: "action.hover" },
                            }}
                            disableRipple
                            tabIndex={-1}
                        >
                            {mainIcon}
                        </IconButton>
                        <IconButton
                            size="small"
                            sx={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                p: 0.5,
                                color: "text.secondary",
                                opacity: 0.7,
                                zIndex: 2
                            }}
                            onClick={handleInfoClick}
                            tabIndex={0}
                        >
                            <InfoOutlinedIcon fontSize="small" />
                        </IconButton>
                        <Popover
                            open={infoOpen}
                            anchorEl={infoAnchor}
                            onClose={handleInfoClose}
                            container={portalContainer.current}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        >
                            <Box sx={{ p: 2, minWidth: 180 }}>
                                <Typography variant="subtitle2">Technical Details</Typography>
                                <Typography variant="body2">Edge: {resource.edge}</Typography>
                                <Typography variant="body2">Device: {resource.device}</Typography>
                                <Typography variant="body2">Pin: {resource.pin}</Typography>
                                <Typography variant="body2">ID: {resource.id}</Typography>
                            </Box>
                        </Popover>
                    </Box>

                    {/* Show error icon if there are errors */}
                    {resource.errors && resource.errors.length > 0 && (
                        <Tooltip
                            title={
                                <React.Fragment>
                                    {resource.errors.map((err, i) => (
                                        <div key={i}>{err}</div>
                                    ))}
                                </React.Fragment>
                            }
                            placement="top"
                            slotProps={{ popper: { container: portalContainer.current } }}

                        >
                            <ErrorIcon
                                color="error"
                                sx={{
                                    position: "absolute",
                                    top: 0,
                                    right: 0,
                                    fontSize: 24,
                                    zIndex: 2,
                                    bgcolor: "background.paper",
                                    borderRadius: "50%",
                                }}
                            />
                        </Tooltip>
                    )}
                </Box>

                <Tooltip title={resource.description}
                    slotProps={{ popper: { container: portalContainer.current } }}>
                    <Typography variant="h6" noWrap gutterBottom sx={{ width: "100%", textAlign: "center" }}>
                        {resource.name}
                    </Typography>
                </Tooltip>

                <Box sx={{ mt: 2 }}>
                    <ResourceActionButton resource={resource} state={state} />
                </Box>
            </CardContent>

        </Card >
    );
}
