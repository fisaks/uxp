import DescriptionIcon from "@mui/icons-material/Description";
import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { alpha, Box, Card, CardActionArea, CircularProgress, IconButton, Popover, Tooltip, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { RuntimeInteractionView, RuntimeViewCommandTarget, UhnResourceCommand } from "@uhn/common";
import React, { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { LocationTileAnalogSection } from "../../location/components/LocationTileAnalogSection";
import { getBlueprintIcon } from "../blueprintIconMap";
import { useSendViewCommand } from "../hooks/useSendViewCommand";
import { StateDisplayValue } from "../viewSelectors";
import { FlashItem, FlankingColumn, IndicatorItem, splitFlankingValues } from "./ViewStateDisplay";

type ViewTileProps = {
    view: RuntimeInteractionView;
    active: boolean;
    stateDisplayValues: StateDisplayValue[];
    nameOverride?: string;
};

/** Stops pointer/click events from bubbling to CardActionArea */
const stopPropagation = {
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
};

export const ViewTile: React.FC<ViewTileProps> = ({ view, active, stateDisplayValues, nameOverride }) => {
    const theme = useTheme();
    const portalContainer = usePortalContainerRef();
    const sendCommand = useSendViewCommand();
    const hasCommand = !!view.command;
    const isAnalog = view.command?.type === "setAnalog";
    const [pending, setPending] = useState(false);
    const [infoAnchor, setInfoAnchor] = useState<null | HTMLElement>(null);
    const [descAnchor, setDescAnchor] = useState<null | HTMLElement>(null);

    const tooltipProps = { enterDelay: 600, enterTouchDelay: 0, slotProps: { popper: { container: portalContainer.current } } };

    const indicators = useMemo(() => stateDisplayValues.filter(i => i.style === "indicator"), [stateDisplayValues]);
    const flashItems = useMemo(() => stateDisplayValues.filter(i => i.style === "flash"), [stateDisplayValues]);

    const sendForTarget = useCallback(async (target: RuntimeViewCommandTarget) => {
        switch (target.type) {
            case "tap":
                await sendCommand(target.resourceId, { type: "tap" });
                break;
            case "toggle":
                await sendCommand(target.resourceId, { type: "toggle" });
                break;
            case "longPress":
                await sendCommand(target.resourceId, { type: "longPress", holdMs: target.holdMs ?? 1000 });
                break;
            case "setAnalog": {
                const min = target.min ?? 0;
                const max = target.max ?? 100;
                const targetValue = active ? min : max;
                await sendCommand(target.resourceId, { type: "setAnalog", value: targetValue });
                break;
            }
            case "clearTimer":
                await sendCommand(target.resourceId, { type: "clearTimer" });
                break;
        }
    }, [sendCommand, view, active]);

    const handleClick = useCallback(async () => {
        if (!view.command) return;
        setPending(true);
        try {
            if (active && view.command.onDeactivate) {
                await sendForTarget(view.command.onDeactivate);
            } else {
                await sendForTarget(view.command);
            }
        } finally {
            setPending(false);
        }
    }, [view.command, active, sendForTarget]);

    const iconEntry = getBlueprintIcon(view.icon);
    const IconComponent = iconEntry
        ? (active || !iconEntry.inactive ? iconEntry.active : iconEntry.inactive)
        : DeviceHubIcon;

    const mode = theme.palette.mode;
    const activeColor = iconEntry?.colors?.active[mode] ?? theme.palette.primary.main;
    const inactiveColor = theme.palette.action.disabled;
    const iconColor = active ? activeColor : inactiveColor;

    const surfaceColor = active && iconEntry?.colors
        ? alpha(iconEntry.colors.surface[mode], mode === "dark" ? 0.06 : 0.045)
        : undefined;

    const displayName = nameOverride ?? view.name ?? view.id;

    // Analog section support
    const analogSendCommand = useCallback(async (cmd: UhnResourceCommand) => {
        if (!view.command) return;
        await sendCommand(view.command.resourceId, cmd);
    }, [sendCommand, view.command]);

    const runtimeStateById = useSelector((s: any) => s.runtimeState?.byResourceId);
    const analogState = view.command ? runtimeStateById?.[view.command.resourceId] : undefined;

    const { left, right } = splitFlankingValues(stateDisplayValues);

    const content = (
        <Box sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pt: "28px",
            pb: isAnalog ? 1 : { xs: 3, sm: 1 },
            px: 1,
            width: "100%",
        }}>
            {/* Icon row: [left values] [icon] [right values] */}
            <Box sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                mb: 0.5,
            }}>
                <FlankingColumn items={left} align="right" />
                <Box sx={{ position: "relative", flexShrink: 0 }}>
                    <IconComponent sx={{
                        fontSize: 40,
                        color: iconColor,
                        transition: "color 0.2s, transform 0.15s",
                    }} />
                    {flashItems.length > 0 && (
                        <Box sx={{
                            position: "absolute",
                            bottom: -6,
                            left: "50%",
                            transform: "translateX(-50%)",
                            display: "flex",
                            gap: 0.25,
                        }}>
                            {flashItems.map(item => (
                                <FlashItem key={item.resourceId} item={item} />
                            ))}
                        </Box>
                    )}
                </Box>
                <FlankingColumn items={right} align="left" />
            </Box>
            <Typography
                variant="body2"
                align="center"
                sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: "1.2em",
                }}
            >
                {displayName}
            </Typography>
        </Box>
    );

    const analogSection = isAnalog && view.command && (
        <Box data-analog-section {...stopPropagation}>
            <LocationTileAnalogSection
                min={view.command.min ?? 0}
                max={view.command.max ?? 100}
                step={view.command.step ?? 1}
                unit={view.command.unit ?? ""}
                iconColor={iconColor}
                state={analogState}
                sendCommand={analogSendCommand}
            />
        </Box>
    );

    return (
        <Card
            variant="outlined"
            sx={{
                position: "relative",
                borderRadius: 3,
                boxShadow: 2,
                height: { xs: "auto", sm: 166 },
                display: "flex",
                flexDirection: "column",
                backgroundColor: surfaceColor,
                transition: "background-color 0.3s, box-shadow 0.2s",
                "&:hover": hasCommand ? {
                    boxShadow: 4,
                } : undefined,
            }}
        >
            {/* Info icon — top-left */}
            <Box sx={{ position: "absolute", top: 6, left: 6, zIndex: 2, pointerEvents: "auto" }}>
                <Tooltip title="Technical info" {...tooltipProps}>
                    <IconButton size="small" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setInfoAnchor(e.currentTarget); }} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
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
                    <Box sx={{ p: 2, minWidth: 180 }}>
                        <Typography variant="subtitle2">View Details</Typography>
                        <Typography variant="body2">ID: {view.id}</Typography>
                        {view.command && <Typography variant="body2">Command: {view.command.type}</Typography>}
                        {view.command && <Typography variant="body2">Target: {view.command.resourceId}</Typography>}
                        {view.stateFrom.length > 0 && (
                            <Typography variant="body2">State from: {view.stateFrom.map(s => s.resourceId).join(", ")}</Typography>
                        )}
                        {view.stateAggregation && <Typography variant="body2">Aggregation: {view.stateAggregation}</Typography>}
                    </Box>
                </Popover>
            </Box>

            {/* Description icon — top-right (before indicators) */}
            {view.description && (
                <Box sx={{ position: "absolute", top: 6, right: 6, zIndex: 2, pointerEvents: "auto" }}>
                    <Tooltip title="Show description" {...tooltipProps}>
                        <IconButton size="small" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDescAnchor(e.currentTarget); }} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                            <DescriptionIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                        </IconButton>
                    </Tooltip>
                    <Popover
                        open={!!descAnchor}
                        anchorEl={descAnchor}
                        onClose={() => setDescAnchor(null)}
                        container={portalContainer.current}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    >
                        <Box sx={{ p: 2, minWidth: 200 }}>
                            <Typography variant="body2">{view.description}</Typography>
                        </Box>
                    </Popover>
                </Box>
            )}

            {/* Indicators — centered above main icon */}
            {indicators.length > 0 && (
                <Box sx={{
                    position: "absolute",
                    top: 8,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: 0.5,
                    zIndex: 1,
                }}>
                    {indicators.map(item => (
                        <IndicatorItem key={item.resourceId} item={item} />
                    ))}
                </Box>
            )}
            {hasCommand ? (
                <CardActionArea onClick={handleClick} disabled={pending} sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    justifyContent: "flex-start",
                    touchAction: "manipulation",
                    transition: "transform 100ms ease, box-shadow 100ms ease",
                    "&:active:not(:has([data-analog-section]:active))": { transform: "scale(0.97)", boxShadow: 6 },
                }}>
                    {content}
                    {analogSection}
                </CardActionArea>
            ) : (
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    {content}
                    {analogSection}
                </Box>
            )}

            {pending && (
                <CircularProgress
                    size={16}
                    thickness={5}
                    sx={{ position: "absolute", bottom: 11, right: 11 }}
                />
            )}
        </Card>
    );
};
