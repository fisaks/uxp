import DescriptionIcon from "@mui/icons-material/Description";
import ErrorIcon from "@mui/icons-material/Error";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, Card, CardActionArea, IconButton, Popover, Tooltip, Typography, alpha } from "@mui/material";
import { Theme, useTheme } from "@mui/material/styles";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useState } from "react";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";
import { inputKindColors, outputKindColors } from "./colors";
import { getResourceIcon } from "./icons";




function getResourceIconColor(
    theme: Theme,
    resource: TileRuntimeResource,
    state?: TileRuntimeResourceState

) {
    if (resource.errors?.length) return theme.palette.error.main;

    const mode = theme.palette.mode; // "light" | "dark"
    const active = Boolean(state?.value);

    if (resource.type === "digitalOutput" && resource.outputKind) {
        const cfg = outputKindColors[resource.outputKind as keyof typeof outputKindColors];
        return active ? cfg.icon.active[mode] : cfg.icon.inactive[mode];
    }

    if (resource.type === "digitalInput" && resource.inputKind) {
        const cfg = inputKindColors[resource.inputKind as keyof typeof inputKindColors];
        return active ? cfg.icon.active[mode] : cfg.icon.inactive[mode];
    }

    return theme.palette.text.disabled;
}

function getResourceSurfaceColor(
    theme: Theme,
    resource: TileRuntimeResource
) {
    const mode = theme.palette.mode;

    if (resource.type === "digitalOutput" && resource.outputKind) {
        const base = outputKindColors[resource.outputKind as keyof typeof outputKindColors]?.surface?.[mode];
        if (!base) return "transparent";

        return alpha(base, mode === "dark" ? 0.1 : 0.045);
    }

    if (resource.type === "digitalInput" && resource.inputKind) {
        const base = inputKindColors[resource.inputKind as keyof typeof inputKindColors]?.surface?.[mode];
        if (!base) return "transparent";

        return alpha(base, mode === "dark" ? 0.1 : 0.045);
    }

    return "transparent";
}

type ResourceTileProps = {
    resource: TileRuntimeResource;
    state?: TileRuntimeResourceState;
    onAction: (id: string) => void;
};

export const ResourceTile: React.FC<ResourceTileProps> = ({ resource, state, onAction }) => {
    const theme = useTheme();
    const portalContainer = usePortalContainerRef();
    const [infoAnchor, setInfoAnchor] = useState<null | HTMLElement>(null);
    const [descAnchor, setDescAnchor] = useState<null | HTMLElement>(null);

    // Main kind icon logic
    const MainIcon = getResourceIcon(resource, state);

    const iconColor = getResourceIconColor(theme, resource, state);

    // Main action (only on card press, not icon press)
    const handleTileClick = (e: React.MouseEvent) => {
        // Only trigger if not clicking an icon (stopPropagation in icon handlers)
        onAction(resource.id);
    };

    // Info and Description popover logic
    const handleInfoIconClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setInfoAnchor(e.currentTarget as HTMLElement);
    };
    const handleDescIconClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setDescAnchor(e.currentTarget as HTMLElement);
    };

    const closeInfo = () => setInfoAnchor(null);
    const closeDesc = () => setDescAnchor(null);
    const haveErrors = resource.errors && resource.errors.length > 0;
    // Delay for tooltip on PC (600ms), no delay on mobile
    const tooltipProps = { enterDelay: 600, enterTouchDelay: 0, slotProps: { popper: { container: portalContainer.current } } };

    return (
        <Card
            variant="outlined"
            sx={{
                borderRadius: 3,
                boxShadow: 2,
                position: "relative",
                overflow: "hidden",
                backgroundColor: getResourceSurfaceColor(theme, resource),
            }}
        >
            <Box
                sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 40,              // LARGE top margin
                    zIndex: 2,
                    pointerEvents: "none",   // icons clickable
                }}
            >
                {/* (i) Info icon */}
                <Box sx={{ position: "absolute", top: 6, left: 6, pointerEvents: "auto" }}>
                    <Tooltip title="Technical info" {...tooltipProps}>
                        <IconButton size="small" onClick={handleInfoIconClick} >
                            <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                    <Popover
                        open={!!infoAnchor}
                        anchorEl={infoAnchor}
                        onClose={closeInfo}
                        container={portalContainer.current}
                        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                    >
                        <Box sx={{ p: 2, minWidth: 180 }}>
                            <Typography variant="subtitle2">Technical Details</Typography>
                            <Typography variant="body2">ID: {resource.id}</Typography>
                            <Typography variant="body2">Edge: {resource.edge}</Typography>
                            <Typography variant="body2">Device: {resource.device}</Typography>
                            <Typography variant="body2">Pin: {resource.pin}</Typography>
                            <Typography variant="body2">Type: {resource.type}</Typography>
                            <Typography variant="body2">Kind: {resource.inputKind ?? resource.outputKind ?? "N/A"}</Typography>
                            {resource.inputType && <Typography variant="body2">Input Type: {resource.inputType}</Typography>}

                        </Box>
                    </Popover>
                </Box>

                {/* Description icon (upper right) */}
                {resource.description && (
                    <Box sx={{ position: "absolute", top: 6, right: 6, pointerEvents: "auto" }}>
                        <Tooltip title="Show description" {...tooltipProps}>
                            <IconButton size="small" onClick={handleDescIconClick} >
                                <DescriptionIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                        <Popover
                            open={!!descAnchor}
                            anchorEl={descAnchor}
                            onClose={closeDesc}
                            container={portalContainer.current}
                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        >
                            <Box sx={{ p: 2, minWidth: 200 }}>
                                <Typography variant="body2">{resource.description}</Typography>
                            </Box>
                        </Popover>
                    </Box>
                )}

            </Box>
            {/* Main content row: kind icon, name */}
            <CardActionArea
                disabled={haveErrors}
                sx={{
                    // push content below overlay
                    pt: "40px",
                    px: 1.5,
                    pb: 1.25,

                    transition: theme.transitions.create(
                        ["transform", "box-shadow", "background-color"],
                        { duration: theme.transitions.duration.short }
                    ),

                    "&:hover": haveErrors ? { backgroundColor: alpha(theme.palette.error.main, 0.1), } : {
                        backgroundColor: alpha(theme.palette.primary.main, 0.03),
                        "& .resource-main-icon-container": {
                            transform: "translateX(-50%) scale(1.12)",
                        }
                    },

                    "&:active": haveErrors ? {} : {
                        transform: "scale(0.97)",
                        boxShadow: 6,
                        "& .resource-main-icon-container": {
                            transform: "translateX(-50%) scale(1.06)",
                        },
                    },
                    "&.Mui-disabled": {
                        pointerEvents: "auto",
                    }

                }}
                onClick={handleTileClick}
            >
                <Box className="resource-main-icon-container"
                    sx={{
                        position: "absolute", top: 6, left: "50%",
                        transform: "translateX(-50%)",
                        transformOrigin: "center",
                        transition: theme.transitions.create(["transform"], {
                            duration: theme.transitions.duration.short,
                        }),
                        pointerEvents: "none"

                    }}>


                    {React.cloneElement(MainIcon, {
                        sx:
                        {
                            color: iconColor,
                            fontSize: 24,
                        }
                    })}
                    {haveErrors && (
                        <Tooltip title={
                            <Box>
                                {resource.errors!.map((e, i) => (
                                    <Typography key={i} variant="caption">{e}</Typography>
                                ))}
                            </Box>}
                            {...tooltipProps}
                        >
                            <ErrorIcon
                                color="error"
                                fontSize="small"
                                sx={{
                                    position: "absolute",
                                    top: -2,
                                    right: -10,
                                    fontSize: 18,
                                    bgcolor: "background.paper",
                                    borderRadius: "50%",
                                    boxShadow: 1,
                                    zIndex: 5,
                                    pointerEvents: "auto"

                                }}
                            />
                        </Tooltip>
                    )}

                </Box>

                <Box sx={{ display: "flex", alignItems: "center" }}>

                    <Typography variant="subtitle1" sx={{
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",

                        overflow: "hidden",
                        textOverflow: "ellipsis",

                        lineHeight: 1.2,
                        minHeight: "2.4em", // exactly 2 lines
                    }}>
                        {resource.name}
                    </Typography>
                </Box>
            </CardActionArea>
        </Card>
    );
};
