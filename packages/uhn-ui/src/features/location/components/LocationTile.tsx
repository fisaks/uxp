import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import TuneIcon from "@mui/icons-material/Tune";
import { alpha, Box, Card, CardActionArea, CircularProgress, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { RuntimeInteractionView, RuntimeViewCommandTarget, UhnResourceCommand } from "@uhn/common";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { ComplexPanel } from "../../resource/components/ComplexPanel";
import { getResourceIcon } from "../../resource/components/icons";
import { getResourceIconColor, getResourceSurfaceColor } from "../../resource/components/colors";
import { useResourceAction } from "../../resource/hooks/useResourceAction";
import { useSendResourceCommand } from "../../resource/hooks/useSendResourceCommand";
import { TileRuntimeResource, TileRuntimeResourceState } from "../../resource/resource-ui.type";
import { selectResourceCommandFeedbackById } from "../../resource/resourceCommandFeedbackSelector";
import { getBlueprintIcon } from "../../view/blueprintIconMap";
import { FlashItem, FlankingColumn, IndicatorItem, splitFlankingValues } from "../../view/components/ViewStateDisplay";
import { useSendViewCommand } from "../../view/hooks/useSendViewCommand";
import { StateDisplayValue } from "../../view/viewSelectors";
import { LocationTileAnalogSection } from "./LocationTileAnalogSection";

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

type LocationTileViewProps = {
    kind: "view";
    view: RuntimeInteractionView;
    active: boolean;
    stateDisplayValues: StateDisplayValue[];
    nameOverride?: string;
};

type LocationTileResourceProps = {
    kind: "resource";
    resource: TileRuntimeResource;
    state?: TileRuntimeResourceState;
    nameOverride?: string;
};

type LocationTileProps = LocationTileViewProps | LocationTileResourceProps;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Stops pointer/click events from bubbling to CardActionArea */
const stopPropagation = {
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
};

/* ------------------------------------------------------------------ */
/* LocationTile                                                        */
/* ------------------------------------------------------------------ */

export const LocationTile: React.FC<LocationTileProps> = (props) => {
    if (props.kind === "view") return <LocationTileView {...props} />;
    return <LocationTileResource {...props} />;
};

/* ------------------------------------------------------------------ */
/* View variant                                                        */
/* ------------------------------------------------------------------ */

const LocationTileView: React.FC<LocationTileViewProps> = ({ view, active, stateDisplayValues, nameOverride }) => {
    const theme = useTheme();
    const sendCommand = useSendViewCommand();
    const hasCommand = !!view.command;
    const [pending, setPending] = useState(false);

    const isAnalog = view.command?.type === "setAnalog";
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
    }, [sendCommand, active]);

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

    // Icon resolution
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

    // Build sendCommand wrapper for analog section (view commands go through useSendViewCommand)
    const analogSendCommand = useCallback(async (cmd: UhnResourceCommand) => {
        if (!view.command) return;
        await sendCommand(view.command.resourceId, cmd);
    }, [sendCommand, view.command]);

    // State for analog section — need to get the resource state for the command target
    const runtimeStateById = useSelector((s: any) => s.runtimeState?.byResourceId);
    const analogState = view.command ? runtimeStateById?.[view.command.resourceId] : undefined;

    const tileContent = (
        <TileContent
            icon={<IconComponent sx={{ fontSize: 40, color: iconColor, transition: "color 0.2s" }} />}
            flashItems={flashItems}
            stateValues={stateDisplayValues}
            displayName={displayName}
            hasAnalog={isAnalog}
        />
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
                height: { xs: "auto", sm: 154 },
                display: "flex",
                flexDirection: "column",
                backgroundColor: surfaceColor,
                transition: "background-color 0.3s, box-shadow 0.2s",
                "&:hover": hasCommand ? { boxShadow: 4 } : undefined,
            }}
        >
            {/* Indicators — centered above main icon */}
            {indicators.length > 0 && (
                <Box sx={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 0.5, zIndex: 1 }}>
                    {indicators.map(item => <IndicatorItem key={item.resourceId} item={item} />)}
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
                    {tileContent}
                    {analogSection}
                </CardActionArea>
            ) : (
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    {tileContent}
                    {analogSection}
                </Box>
            )}

            {pending && (
                <CircularProgress size={16} thickness={5} sx={{ position: "absolute", bottom: 11, right: 11 }} />
            )}
        </Card>
    );
};

/* ------------------------------------------------------------------ */
/* Resource variant                                                    */
/* ------------------------------------------------------------------ */

const LocationTileResource: React.FC<LocationTileResourceProps> = ({ resource, state, nameOverride }) => {
    const theme = useTheme();
    const portalContainer = usePortalContainerRef();
    const commandFb = useSelector(selectResourceCommandFeedbackById(resource.id));
    const sendResourceCommand = useSendResourceCommand(resource.id);
    const tileActionAreaRef = useRef<HTMLButtonElement>(null);
    const [complexPanelAnchor, setComplexPanelAnchor] = useState<HTMLElement | null>(null);

    const isAnalog = resource.type === "analogOutput" || resource.type === "virtualAnalogOutput";
    const isTimer = resource.type === "timer";
    const isComplex = resource.type === "complex";
    const isReadOnly = resource.type === "analogInput";
    const hasComplexPanel = isComplex && (resource.subResources?.length ?? 0) > 0;
    const active = Boolean(state?.value);
    const isPending = commandFb?.status === "pending";
    const hasErrors = resource.errors && resource.errors.length > 0;

    const openComplexPanel = useCallback(() => {
        setComplexPanelAnchor(tileActionAreaRef.current);
    }, []);

    // Resource interaction — complex resources get long-press callback to open panel
    const actions = useResourceAction(resource, state, {
        onLongPress: hasComplexPanel ? openComplexPanel : undefined,
    });

    // Icon/color
    const MainIcon = getResourceIcon(resource, state);
    const iconColor = getResourceIconColor(theme, resource, state);
    const surfaceColor = getResourceSurfaceColor(theme, resource);

    const displayName = nameOverride ?? resource.name;

    // Build flanking state values from resource state
    const resourceStateValues = useMemo((): StateDisplayValue[] => {
        const hasValue = (isReadOnly || isTimer || isComplex) && state?.value !== undefined;
        if (!hasValue) return [];
        // Complex boolean resources show state via icon color, not text
        if (isComplex && typeof state?.value === "boolean") return [];

        // Derive label from resource type/kind
        let label: string | undefined;
        if (isTimer) {
            label = "Timer";
        } else if (isReadOnly && resource.analogInputKind) {
            label = resource.analogInputKind.charAt(0).toUpperCase() + resource.analogInputKind.slice(1);
        } else if (isComplex) {
            label = resource.stateLabel;
        }

        return [{
            resourceId: resource.id,
            resourceType: resource.type,
            label,
            unit: resource.unit,
            style: "value" as const,
            value: state?.value,
            active,
            timestamp: state?.timestamp ?? 0,
            details: state?.details,
        }];
    }, [resource.id, resource.type, resource.unit, resource.analogInputKind, resource.stateLabel, isReadOnly, isTimer, isComplex, state?.value, state?.timestamp, state?.details, active]);

    const tileContent = (
        <TileContent
            icon={
                hasComplexPanel ? (
                    <Box sx={{ position: "relative", display: "inline-flex" }}>
                        <MainIcon sx={{ fontSize: 40, color: iconColor, transition: "color 0.2s" }} />
                        <TuneIcon sx={{
                            position: "absolute", bottom: -4, right: -8,
                            fontSize: 16, color: iconColor, opacity: active ? 0.5 : 0.7,
                        }} />
                    </Box>
                ) : (
                    <MainIcon sx={{ fontSize: 40, color: iconColor, transition: "color 0.2s" }} />
                )
            }
            iconClickable={hasComplexPanel}
            onIconClick={hasComplexPanel ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                openComplexPanel();
            } : undefined}
            displayName={displayName}
            stateValues={resourceStateValues}
            hasAnalog={isAnalog}
        />
    );

    const analogSection = isAnalog && (
        <Box data-analog-section {...stopPropagation}>
            <LocationTileAnalogSection
                min={resource.min ?? 0}
                max={resource.max ?? 65535}
                step={resource.step ?? 1}
                unit={resource.unit ?? ""}
                iconColor={iconColor}
                state={state}
                sendCommand={sendResourceCommand}
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
                height: { xs: "auto", sm: 154 },
                display: "flex",
                flexDirection: "column",
                backgroundColor: surfaceColor,
                transition: "background-color 0.3s, box-shadow 0.2s",
                "&:hover": (!hasErrors && !isReadOnly) ? { boxShadow: 4 } : undefined,
            }}
        >
            {isReadOnly ? (
                <TileContent
                    icon={<MainIcon sx={{ fontSize: 40, color: iconColor, transition: "color 0.2s" }} />}
                    displayName={displayName}
                    stateValues={resourceStateValues}
                />
            ) : (
                <CardActionArea
                    ref={tileActionAreaRef}
                    disabled={hasErrors || isPending}
                    sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                        justifyContent: "flex-start",
                        touchAction: "manipulation",
                        transition: "transform 100ms ease, box-shadow 100ms ease",
                        "&:active:not(:has([data-analog-section]:active))": hasErrors ? {} : { transform: "scale(0.97)", boxShadow: 6 },
                        "&.Mui-disabled": { pointerEvents: "auto" },
                    }}
                    {...actions}
                >
                    {tileContent}
                    {analogSection}
                </CardActionArea>
            )}

            {/* Complex panel popover */}
            {hasComplexPanel && (
                <ComplexPanel ctx={{
                    resource,
                    state,
                    theme,
                    iconColor,
                    anchorEl: complexPanelAnchor,
                    onClose: () => setComplexPanelAnchor(null),
                }} />
            )}

            {isPending && (
                <CircularProgress size={16} thickness={5} sx={{ position: "absolute", bottom: 11, right: 11 }} />
            )}
        </Card>
    );
};

/* ------------------------------------------------------------------ */
/* Shared tile content layout                                          */
/* ------------------------------------------------------------------ */

type TileContentProps = {
    icon: React.ReactNode;
    iconClickable?: boolean;
    onIconClick?: (e: React.MouseEvent) => void;
    flashItems?: StateDisplayValue[];
    stateValues?: StateDisplayValue[];
    displayName: string;
    hasAnalog?: boolean;
};

const TileContent: React.FC<TileContentProps> = ({ icon, iconClickable, onIconClick, flashItems, stateValues, displayName, hasAnalog }) => {
    const { left, right } = stateValues ? splitFlankingValues(stateValues) : { left: [], right: [] };

    return (
        <Box sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pt: 2.5,
            pb: hasAnalog ? 1 : { xs: 3, sm: 1 },
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
                <Box
                    sx={{
                        position: "relative",
                        flexShrink: 0,
                        ...(iconClickable && {
                            cursor: "pointer",
                            borderRadius: "50%",
                            "&:hover": { backgroundColor: "action.hover" },
                        }),
                    }}
                    onPointerDown={iconClickable ? (e: React.PointerEvent) => {
                        e.stopPropagation();
                    } : undefined}
                    onClick={onIconClick}
                >
                    {icon}
                    {flashItems && flashItems.length > 0 && (
                        <Box sx={{
                            position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
                            display: "flex", gap: 0.25,
                        }}>
                            {flashItems.map(item => <FlashItem key={item.resourceId} item={item} />)}
                        </Box>
                    )}
                </Box>
                <FlankingColumn items={right} align="left" />
            </Box>

            {/* Display name */}
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
};
