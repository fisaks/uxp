import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";
import ErrorIcon from "@mui/icons-material/Error";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Box, Card, CardActionArea, IconButton, Tooltip, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { isLogicalResource, isPhysicalResource } from "@uhn/common";
import React, { useCallback, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { TechnicalDeepLink } from "../../shared/TechnicalDeepLink";
import { TileDescriptionPopover } from "../../shared/TileDescriptionPopover";
import { triggerEventLabel } from "../../shared/triggerEventLabel";
import { TileInfoPopover } from "../../shared/TileInfoPopover";
import { TilePendingIndicator } from "../../shared/TilePendingIndicator";
import { TuneOverlayIcon } from "../../shared/TuneOverlayIcon";
import { createTooltipProps } from "../../shared/tileEventHelpers";
import { useResourceAction } from "../hooks/useResourceAction";
import { isResourceActive } from "../isResourceActive";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";
import { selectRulesByActionHintResourceId, selectRulesByResourceId } from "../../rule/ruleSelectors";
import { selectResourceCommandFeedbackById } from "../resourceCommandFeedbackSelector";
import { getResourceIconColor, getResourceSurfaceColor } from "./colors";
import { getResourceIcon } from "./icons";
import { getTileExtensions } from "./tile-extensions";
import "./ResourceTile.css";
type ResourceTileProps = {
    resource: TileRuntimeResource;
    state?: TileRuntimeResourceState;
    nameOverride?: string;
    /** "details" (default) shows info/description popovers. "removable" shows inline remove and link icons instead. */
    mode?: "details" | "removable";
    /** Called when the remove button is clicked (removable mode). */
    onRemove?: (id: string) => void;
    /** Deep link path for the link button (removable mode). */
    linkTo?: string;
};

export const ResourceTile: React.FC<ResourceTileProps> = ({ resource, state, nameOverride, mode = "details", onRemove, linkTo }) => {
    const theme = useTheme();
    const portalContainer = usePortalContainerRef();
    const navigate = useNavigate();
    const [interactionPanelAnchor, setInteractionPanelAnchor] = useState<null | HTMLElement>(null);
    const tileActionAreaRef = useRef<HTMLButtonElement>(null);
    const commandFb = useSelector(selectResourceCommandFeedbackById(resource.id));
    const rulesByResourceId = useSelector(selectRulesByResourceId);
    const triggeringRules = rulesByResourceId[resource.id];
    const rulesByActionHint = useSelector(selectRulesByActionHintResourceId);
    const targetOfRules = rulesByActionHint[resource.id];

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
                {mode === "details" && (
                    <TileInfoPopover>
                        <Typography variant="subtitle2">Technical Details</Typography>
                        <Typography variant="body2">ID: {resource.id}</Typography>
                        <Typography variant="body2">Type: {resource.type}</Typography>
                        {isPhysicalResource(resource) && (
                            <>
                                <Typography variant="body2">Edge: {resource.edge}</Typography>
                                <Typography variant="body2">Device: {resource.device}</Typography>
                                <Typography variant="body2">Pin: {resource.pin}{typeof resource.pin === "number" ? ` (0x${resource.pin.toString(16).toUpperCase()})` : ""}</Typography>
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
                        {(triggeringRules?.length > 0 || targetOfRules?.length > 0) && (
                            <Box sx={{ mt: 1 }}>
                                <TechnicalDeepLink to={`/technical/rules?search=${encodeURIComponent(resource.id)}`}>
                                    <Typography variant="body2" component="span" color="inherit">See attached rules</Typography>
                                </TechnicalDeepLink>
                            </Box>
                        )}
                        {triggeringRules && triggeringRules.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                                <Typography variant="subtitle2">Triggered by ({triggeringRules.length})</Typography>
                                {triggeringRules.map(rule => {
                                    const trigger = rule.triggers.find(t => t.resourceId === resource.id);
                                    return (
                                        <Typography key={rule.id} variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                                            <TechnicalDeepLink to={`/technical/rules/${rule.id}`}>
                                                {trigger ? triggerEventLabel(trigger) : ""}:{rule.name ?? rule.id}
                                            </TechnicalDeepLink>
                                        </Typography>
                                    );
                                })}
                            </Box>
                        )}
                        {targetOfRules && targetOfRules.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                                <Typography variant="subtitle2">Action target of ({targetOfRules.length})</Typography>
                                {targetOfRules.map(rule => (
                                    <Typography key={rule.id} variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                                        <TechnicalDeepLink to={`/technical/rules/${rule.id}`}>
                                            {rule.name ?? rule.id}
                                        </TechnicalDeepLink>
                                    </Typography>
                                ))}
                            </Box>
                        )}
                    </TileInfoPopover>
                )}

                {/* Type-specific overlay content (analog value, timer countdown, etc.) */}
                {tileExtensions?.renderValue?.(renderCtx)}

                {/* Description icon (upper right) */}
                {mode === "details" && <TileDescriptionPopover description={resource.description} />}

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

                    <TuneOverlayIcon show={hasInteractionPanel} color={iconColor} active={isResourceActive(resource, state)}>
                        <MainIcon sx={{
                            color: iconColor,
                            fontSize: 24,
                            ...(isPending && {
                                "--pulse-from": iconColor,
                                "--pulse-to": alpha(iconColor, 0.45),
                                animation: "resource-pending-pulse 1.4s ease-in-out infinite",
                            })
                        }} />
                    </TuneOverlayIcon>
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
            <TilePendingIndicator pending={isPending} />

            {isCmdError && (
                <Tooltip title={commandFb.error} {...tooltipProps}>
                    {cmdReason === "timeout" ? (
                        <AccessTimeIcon sx={{ position: "absolute", bottom: 11, right: 11, fontSize: 16, color: "warning.main", zIndex: 2 }} />
                    ) : (
                        <WarningAmberIcon sx={{ position: "absolute", bottom: 11, right: 11, fontSize: 16, color: "warning.main", zIndex: 2 }} />
                    )}
                </Tooltip>
            )}

            {mode === "removable" && onRemove && (
                <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onRemove(resource.id); }}
                    sx={{ position: "absolute", top: 4, right: 4, zIndex: 3, p: 0.5, color: "action.disabled", "&:hover": { bgcolor: "action.hover", color: "text.secondary" } }}
                >
                    <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
            )}

            {mode === "removable" && linkTo && !isPending && (
                <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); navigate(linkTo); }}
                    sx={{ position: "absolute", bottom: 4, right: 4, zIndex: 3, p: 0.5, color: "action.disabled", "&:hover": { bgcolor: "action.hover", color: "primary.main" } }}
                >
                    <OpenInNewIcon sx={{ fontSize: 16 }} />
                </IconButton>
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
    