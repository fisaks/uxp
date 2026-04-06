import { Box, Card, CardActionArea, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { RuntimeInteractionView, RuntimeScene } from "@uhn/common";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { getResourceIcon } from "../../resource/components/icons";
import { getResourceIconColor, getResourceSurfaceColor } from "../../resource/components/colors";
import { useResourceAction } from "../../resource/hooks/useResourceAction";
import { useSendResourceCommand } from "../../resource/hooks/useSendResourceCommand";
import { isResourceActive } from "../../resource/isResourceActive";
import { TileRuntimeResource, TileRuntimeResourceState } from "../../resource/resource-ui.type";
import { selectResourceCommandFeedbackById } from "../../resource/resourceCommandFeedbackSelector";
import { SubResourcePopover } from "../../shared/SubResourcePopover";
import { stopPropagation } from "../../shared/tileEventHelpers";
import { useViewAnalogState } from "../../shared/useViewAnalogState";
import { useViewCommand } from "../../shared/useViewCommand";
import { useViewIconColors } from "../../shared/useViewIconColors";
import { useSendViewCommand } from "../../view/hooks/useSendViewCommand";
import { useViewCommandSlots } from "../../view/components/ViewCommandControl";
import { DisplayItemValueState, DisplayItemsState, EMPTY_DISPLAY_ITEMS_STATE } from "../../shared/tile.types";
import { TileAnalogSection } from "../../shared/TileAnalogSection";
import { TuneOverlayIcon } from "../../shared/TuneOverlayIcon";
import { TileContent } from "../../shared/TileContent";
import { useSceneIconColors } from "../../shared/useSceneIconColors";
import { useSceneCommand } from "../../shared/useSceneCommand";
import { TechnicalLinkButton } from "./TechnicalLinkButton";

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

type LocationTileViewProps = {
    kind: "view";
    view: RuntimeInteractionView;
    active: boolean;
    stateDisplay: DisplayItemsState;
    resolvedName?: string;
    /** Location-level name override — takes priority over nameMap and view name. */
    nameOverride?: string;
};

type LocationTileResourceProps = {
    kind: "resource";
    resource: TileRuntimeResource;
    state?: TileRuntimeResourceState;
    /** Location-level name override — takes priority over resource name. */
    nameOverride?: string;
};

type LocationTileSceneProps = {
    kind: "scene";
    scene: RuntimeScene;
    /** Location-level name override — takes priority over scene name. */
    nameOverride?: string;
};

type LocationTileProps = LocationTileViewProps | LocationTileResourceProps | LocationTileSceneProps;

/* ------------------------------------------------------------------ */
/* LocationTile                                                        */
/* ------------------------------------------------------------------ */

export const LocationTile: React.FC<LocationTileProps> = (props) => {
    if (props.kind === "view") return <LocationTileView {...props} />;
    if (props.kind === "scene") return <LocationTileScene {...props} />;
    return <LocationTileResource {...props} />;
};

/* ------------------------------------------------------------------ */
/* View variant                                                        */
/* ------------------------------------------------------------------ */

const LocationTileView: React.FC<LocationTileViewProps> = ({ view, active, stateDisplay, resolvedName, nameOverride }) => {
    const theme = useTheme();
    const sendCommand = useSendViewCommand();
    const hasCommand = !!view.command;
    const isAnalog = view.command?.type === "setAnalog";

    const { handleClick, pending, confirmText } = useViewCommand(view, active, sendCommand);

    // Icon resolution
    const { IconComponent, iconColor, surfaceColor } = useViewIconColors(view.icon, active, theme);

    const displayName = resolvedName ?? nameOverride ?? view.name ?? view.id;

    const {
        analogSendCommand, analogState,
        inlineControl, inlineResource, inlineAnalogSendCommand, inlineAnalogState,
    } = useViewAnalogState(view, sendCommand);

    const hasInlineAnalog = !!inlineControl && !isAnalog;
    const showAnalog = isAnalog || hasInlineAnalog;

    const commandSlots = useViewCommandSlots(view.command, active, sendCommand, IconComponent, iconColor);

    // Controls popover: show when there are controls beyond a single inline-only one
    const singleInlineOnly = view.controls?.length === 1 && view.controls[0].inline;
    const hasPopover = (view.controls?.length ?? 0) > 0 && !singleInlineOnly;

    const [controlsAnchor, setControlsAnchor] = useState<HTMLElement | null>(null);
    const tileRef = useRef<HTMLButtonElement>(null);

    const openControls = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setControlsAnchor(tileRef.current);
    }, []);
    const closeControls = useCallback(() => setControlsAnchor(null), []);

    const iconElement = (
        <TuneOverlayIcon show={hasPopover} color={iconColor} active={active}>
            <IconComponent sx={{ fontSize: 40, color: iconColor, transition: "color 0.2s" }} />
        </TuneOverlayIcon>
    );

    const tileContent = (
        <TileContent
            icon={iconElement}
            onIconClick={hasPopover ? openControls : undefined}
            stateDisplay={confirmText ? undefined : stateDisplay}
            displayName={confirmText ?? displayName}
            hasAnalog={showAnalog}
            showHero={!showAnalog}
        />
    );

    const analogSection = showAnalog && (
        <Box data-analog-section {...stopPropagation}>
            {isAnalog && view.command ? (
                <TileAnalogSection
                    min={view.command.min ?? 0}
                    max={view.command.max ?? 100}
                    step={view.command.step ?? 1}
                    unit={view.command.unit ?? ""}
                    options={view.command.options}
                    iconColor={iconColor}
                    state={analogState}
                    sendCommand={analogSendCommand}
                />
            ) : hasInlineAnalog && inlineResource ? (
                <TileAnalogSection
                    min={inlineResource.min ?? 0}
                    max={inlineResource.max ?? 100}
                    step={inlineResource.step ?? 1}
                    unit={inlineResource.unit ?? ""}
                    options={inlineResource.options}
                    iconColor={iconColor}
                    state={inlineAnalogState}
                    sendCommand={inlineAnalogSendCommand}
                    disabled={!active && !view.alwaysEnableControls}
                />
            ) : null}
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
                transition: "background-color 0.3s, box-shadow 0.2s, border-color 0.2s",
                "&:hover": hasCommand ? { boxShadow: 4 } : undefined,
                ...(confirmText && {
                    borderColor: "warning.main",
                    borderWidth: 2,
                }),
            }}
        >
            {hasCommand ? (
                <CardActionArea ref={tileRef} onClick={handleClick} disabled={pending} sx={{
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

            {pending ? (
                <CircularProgress size={16} thickness={5} sx={{ position: "absolute", bottom: 11, right: 11 }} />
            ) : (
                <TechnicalLinkButton to={`/technical/views/${view.id}`} />
            )}

            {/* Controls popover */}
            {hasPopover && view.controls && (
                <SubResourcePopover
                    items={view.controls}
                    title={view.name ?? displayName}
                    anchorEl={controlsAnchor}
                    onClose={closeControls}
                    titleAction={commandSlots.titleAction}
                    headerContent={commandSlots.headerContent}
                    disabled={!active && !view.alwaysEnableControls}
                />
            )}
        </Card>
    );
};

/* ------------------------------------------------------------------ */
/* Resource variant                                                    */
/* ------------------------------------------------------------------ */

const LocationTileResource: React.FC<LocationTileResourceProps> = ({ resource, state, nameOverride }) => {
    const theme = useTheme();
    const commandFb = useSelector(selectResourceCommandFeedbackById(resource.id));
    const sendResourceCommand = useSendResourceCommand(resource.id);
    const tileActionAreaRef = useRef<HTMLButtonElement>(null);
    const [complexPanelAnchor, setComplexPanelAnchor] = useState<HTMLElement | null>(null);

    const isAnalog = resource.type === "analogOutput" || resource.type === "virtualAnalogOutput";
    const isTimer = resource.type === "timer";
    const isComplex = resource.type === "complex";
    const isReadOnly = resource.type === "analogInput";
    const hasComplexPanel = isComplex && (resource.subResources?.length ?? 0) > 0;
    const active = isResourceActive(resource, state);
    const isPending = commandFb?.status === "pending";
    const hasErrors = resource.errors && resource.errors.length > 0;

    const openComplexPanel = useCallback(() => {
        setComplexPanelAnchor(tileActionAreaRef.current);
    }, []);
    const closeComplexPanel = useCallback(() => setComplexPanelAnchor(null), []);

    // Resource interaction — complex resources get long-press callback to open panel
    const actions = useResourceAction(resource, state, {
        onLongPress: hasComplexPanel ? openComplexPanel : undefined,
    });

    // Icon/color
    const MainIcon = getResourceIcon(resource, state);
    const iconColor = getResourceIconColor(theme, resource, state);
    const surfaceColor = getResourceSurfaceColor(theme, resource);

    const displayName = nameOverride ?? resource.name;

    // Build a minimal DisplayItemsState with the resource value in the left slot
    const resourceStateDisplay = useMemo((): DisplayItemsState => {
        if (!isReadOnly && !isTimer && !isComplex) return EMPTY_DISPLAY_ITEMS_STATE;
        if (state?.value === undefined) return EMPTY_DISPLAY_ITEMS_STATE;
        // Complex boolean resources show state via icon color, not text
        if (isComplex && typeof state.value === "boolean") return EMPTY_DISPLAY_ITEMS_STATE;

        // Derive label from resource type/kind
        let label: string | undefined;
        if (isTimer) {
            label = "Timer";
        } else if (isReadOnly && resource.analogInputKind) {
            label = resource.analogInputKind.charAt(0).toUpperCase() + resource.analogInputKind.slice(1);
        } else if (isComplex) {
            label = resource.stateLabel;
        }

        const item: DisplayItemValueState = {
            resourceId: resource.id,
            resourceType: resource.type,
            label,
            unit: resource.unit,
            value: state?.value,
            active,
            timestamp: state?.timestamp ?? 0,
            details: state?.details,
        };

        return { ...EMPTY_DISPLAY_ITEMS_STATE, left: [item] };
    }, [resource.id, resource.type, resource.unit, resource.analogInputKind, resource.stateLabel, isReadOnly, isTimer, isComplex, state?.value, state?.timestamp, state?.details, active]);

    const tileContent = (
        <TileContent
            icon={
                <TuneOverlayIcon show={hasComplexPanel} color={iconColor} active={active}>
                    <MainIcon sx={{ fontSize: 40, color: iconColor, transition: "color 0.2s" }} />
                </TuneOverlayIcon>
            }
            onIconClick={hasComplexPanel ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                openComplexPanel();
            } : undefined}
            displayName={displayName}
            stateDisplay={resourceStateDisplay}
            hasAnalog={isAnalog}
        />
    );

    const analogSection = isAnalog && (
        <Box data-analog-section {...stopPropagation}>
            <TileAnalogSection
                min={resource.min ?? 0}
                max={resource.max ?? 65535}
                step={resource.step ?? 1}
                unit={resource.unit ?? ""}
                options={resource.options}
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
                    stateDisplay={resourceStateDisplay}
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
            {hasComplexPanel && resource.subResources && (
                <SubResourcePopover
                    items={resource.subResources}
                    title={resource.name}
                    anchorEl={complexPanelAnchor}
                    onClose={closeComplexPanel}
                />
            )}

            {isPending ? (
                <CircularProgress size={16} thickness={5} sx={{ position: "absolute", bottom: 11, right: 11 }} />
            ) : (
                <TechnicalLinkButton to={`/technical/resources/${resource.id}`} />
            )}
        </Card>
    );
};

/* ------------------------------------------------------------------ */
/* Scene variant                                                       */
/* ------------------------------------------------------------------ */

const LocationTileScene: React.FC<LocationTileSceneProps> = ({ scene, nameOverride }) => {
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
                />
            </CardActionArea>

            {pending ? (
                <CircularProgress size={16} thickness={5} sx={{ position: "absolute", bottom: 11, right: 11 }} />
            ) : (
                <TechnicalLinkButton to={`/technical/scenes/${scene.id}`} />
            )}
        </Card>
    );
};

