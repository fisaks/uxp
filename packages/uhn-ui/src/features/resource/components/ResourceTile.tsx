import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DescriptionIcon from "@mui/icons-material/Description";
import ErrorIcon from "@mui/icons-material/Error";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TuneIcon from "@mui/icons-material/Tune";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Box, Card, CardActionArea, CircularProgress, IconButton, Popover, Tooltip, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { isLogicalResource, isPhysicalResource } from "@uhn/common";
import React, { useCallback, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useResourceAction } from "../hooks/useResourceAction";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";
import { selectResourceCommandFeedbackById } from "../resourceCommandFeedbackSelector";
import { getResourceIconColor, getResourceSurfaceColor } from "./colors";
import { getResourceIcon } from "./icons";
import { createTooltipProps } from "../../shared/tileEventHelpers";
import { getTileExtensions } from "./tile-extensions";
import "./ResourceTile.css";
type ResourceTileProps = {
    resource: TileRuntimeResource;
    state?: TileRuntimeResourceState;
    nameOverride?: string;
};

export const ResourceTile: React.FC<ResourceTileProps> = ({ resource, state, nameOverride }) => {
    const theme = useTheme();
    const portalContainer = usePortalContainerRef();
    const [infoAnchor, setInfoAnchor] = useState<null | HTMLElement>(null);
    const [descAnchor, setDescAnchor] = useState<null | HTMLElement>(null);
    const [interactionPanelAnchor, setInteractionPanelAnchor] = useState<null | HTMLElement>(null);
    const tileActionAreaRef = useRef<HTMLButtonElement>(null);
    const commandFb = useSelector(selectResourceCommandFeedbackById(resource.id));

    const tileExtensions = getTileExtensions(resource.type);
    const hasInteractionPanel = Boolean(tileExtensions?.renderInteractionPanel);

    const openInteractionPanel = useCallback(() => {
        setInteractionPanelAnchor(tileActionAreaRef.current);
    }, []);

    const actions = useResourceAction(resource, state, {
        onLongPress: hasInteractionPanel ? openInteractionPanel : undefined,
    });

    // Main kind icon logic
    const MainIcon = getResourceIcon(resource, state);
    const iconColor = getResourceIconColor(theme, resource, state);
    const isAnalog = resource.type === "analogInput" || resource.type === "analogOutput";
    const isReadOnly = resource.type === "analogInput";
    const isPending = commandFb?.status === "pending";
    const isCmdError = commandFb?.status === "error";
    const cmdReason = isCmdError ? commandFb.reason : undefined;

    // Info and Description popover logic
    const handleInfoIconClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setInfoAnchor(e.currentTarget as HTMLElement);
    };
    const handleDescIconClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDescAnchor(e.currentTarget as HTMLElement);
    };

    const closeInfo = () => setInfoAnchor(null);
    const closeDesc = () => setDescAnchor(null);
    const haveErrors = resource.errors && resource.errors.length > 0;
    const tooltipProps = createTooltipProps(portalContainer.current);

    const renderCtx = { resource, state, theme, iconColor, onOpenInteractionPanel: hasInteractionPanel ? openInteractionPanel : undefined };

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
                        <IconButton size="small" onClick={handleInfoIconClick} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                            <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
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
                            <Typography variant="body2">Type: {resource.type}</Typography>
                            {isPhysicalResource(resource) && (
                                <>
                                    <Typography variant="body2">Edge: {resource.edge}</Typography>
                                    <Typography variant="body2">Device: {resource.device}</Typography>
                                    <Typography variant="body2">Pin: {resource.pin}</Typography>
                                </>
                            )}
                            {isLogicalResource(resource) && (
                                <Typography variant="body2">Host: {resource.host}</Typography>
                            )}
                            <Typography variant="body2">Kind: {resource.inputKind ?? resource.outputKind ?? resource.analogInputKind ?? resource.analogOutputKind ?? "N/A"}</Typography>
                            {resource.inputType && <Typography variant="body2">Input Type: {resource.inputType}</Typography>}
                            {isAnalog && resource.min !== undefined && <Typography variant="body2">Min: {resource.min}</Typography>}
                            {isAnalog && resource.max !== undefined && <Typography variant="body2">Max: {resource.max}</Typography>}
                            {isAnalog && resource.unit && <Typography variant="body2">Unit: {resource.unit}</Typography>}

                        </Box>
                    </Popover>
                </Box>

                {/* Type-specific overlay content (analog value, timer countdown, etc.) */}
                {tileExtensions?.renderValue?.(renderCtx)}

                {/* Description icon (upper right) */}
                {resource.description && (
                    <Box sx={{ position: "absolute", top: 6, right: 6, pointerEvents: "auto" }}>
                        <Tooltip title="Show description" {...tooltipProps}>
                            <IconButton size="small" onClick={handleDescIconClick} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                                <DescriptionIcon sx={{ fontSize: 16, color: "text.secondary" }} />
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
                ref={tileActionAreaRef}
                disabled={haveErrors || isPending}
                sx={{
                    // push content below info/description overlay icons
                    pt: 5,
                    px: 1.5,
                    pb: 1.25,

                    transition: theme.transitions.create(
                        ["transform", "box-shadow", "background-color"],
                        { duration: theme.transitions.duration.short }
                    ),

                    "&:hover": haveErrors ? { backgroundColor: alpha(theme.palette.error.main, 0.1), } : isReadOnly ? {} : {
                        backgroundColor: alpha(theme.palette.primary.main, 0.03),
                        "& .resource-main-icon-container": {
                            transform: "translateX(-50%) scale(1.12)",
                        }
                    },

                    "&:active": (haveErrors || isReadOnly) ? {} : {
                        transform: "scale(0.97)",
                        boxShadow: 6,
                        "& .resource-main-icon-container": {
                            transform: "translateX(-50%) scale(1.06)",
                        },
                    },
                    "&.Mui-disabled": {
                        pointerEvents: "auto",
                    },
                    ...(isReadOnly && {
                        cursor: "default",
                        "& .MuiCardActionArea-focusHighlight": { display: "none" },
                    }),

                }}
                disableRipple={isReadOnly}
                {...actions}
            >
                <Box className="resource-main-icon-container"
                    onPointerDown={hasInteractionPanel ? (e: React.PointerEvent) => {
                        e.stopPropagation();
                    } : undefined}
                    onClick={hasInteractionPanel ? (e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openInteractionPanel();
                    } : undefined}
                    sx={{
                        position: "absolute", top: 6, left: "50%",
                        transform: "translateX(-50%)",
                        transformOrigin: "center",
                        transition: theme.transitions.create(["transform"], {
                            duration: theme.transitions.duration.short,
                        }),
                        pointerEvents: hasInteractionPanel ? "auto" : "none",
                        cursor: hasInteractionPanel ? "pointer" : undefined,
                    }}>

                    <MainIcon sx={{
                        color: iconColor,
                        fontSize: 24,
                        ...(isPending && {
                            "--pulse-from": iconColor,
                            "--pulse-to": alpha(iconColor, 0.45),
                            animation: "resource-pending-pulse 1.4s ease-in-out infinite",
                        })
                    }} />
                    {hasInteractionPanel && (
                        <TuneIcon
                            sx={{
                                position: "absolute",
                                bottom: -4,
                                right: -8,
                                fontSize: 16,
                                color: iconColor,
                                opacity: Boolean(state?.value) ? 0.5 : 0.7,
                            }}
                        />
                    )}
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

                <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>

                    <Typography variant="body2" align="center" sx={{
                        width: "100%",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",

                        overflow: "hidden",
                        textOverflow: "ellipsis",

                        lineHeight: 1.2,
                        minHeight: "2.4em", // exactly 2 lines
                    }}>
                        {nameOverride ?? resource.name}
                    </Typography>
                </Box>
            </CardActionArea>
            {isPending && (
                <CircularProgress
                    size={16}
                    thickness={5}
                    sx={{
                        position: "absolute",
                        bottom: 11,
                        right: 11,
                        p: 0.25,
                    }}
                />
            )}

            {isCmdError && (
                <Box
                    sx={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 34,
                        height: 34,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2,
                        pointerEvents: "auto",   // icons clickable

                    }}
                >
                    <Tooltip title={commandFb.error} {...tooltipProps}>
                        {cmdReason === "timeout" ? (
                            <AccessTimeIcon
                                sx={{
                                    position: "absolute",
                                    bottom: 11,
                                    right: 11,
                                    fontSize: 16,
                                    color: "warning.main",

                                }}
                            />
                        ) : (
                            <WarningAmberIcon
                                sx={{
                                    position: "absolute",
                                    bottom: 11,
                                    right: 11,
                                    fontSize: 16,
                                    color: "warning.main",

                                }}
                            />
                        )}
                    </Tooltip>
                </Box>
            )}

            {/* Type-specific expanded popover (analog slider, complex detail, etc.) */}
            {tileExtensions?.renderInteractionPanel?.({
                ...renderCtx,
                anchorEl: interactionPanelAnchor,
                onClose: () => setInteractionPanelAnchor(null),
            })}
        </Card>
    );
};
    