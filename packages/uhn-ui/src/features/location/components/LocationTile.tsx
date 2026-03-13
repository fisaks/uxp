import TuneIcon from "@mui/icons-material/Tune";
import { Box, Card, CardActionArea, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { RuntimeInteractionView, RuntimeScene } from "@uhn/common";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { ComplexPanel } from "../../resource/components/ComplexPanel";
import { getResourceIcon } from "../../resource/components/icons";
import { getResourceIconColor, getResourceSurfaceColor } from "../../resource/components/colors";
import { useResourceAction } from "../../resource/hooks/useResourceAction";
import { useSendResourceCommand } from "../../resource/hooks/useSendResourceCommand";
import { isResourceActive } from "../../resource/isResourceActive";
import { TileRuntimeResource, TileRuntimeResourceState } from "../../resource/resource-ui.type";
import { selectResourceCommandFeedbackById } from "../../resource/resourceCommandFeedbackSelector";
import { stopPropagation } from "../../shared/tileEventHelpers";
import { useViewAnalogState } from "../../shared/useViewAnalogState";
import { useViewCommand } from "../../shared/useViewCommand";
import { useViewIconColors } from "../../shared/useViewIconColors";
import { useSendViewCommand } from "../../view/hooks/useSendViewCommand";
import { TileStateItem } from "../../shared/tile.types";
import { TileAnalogSection } from "../../shared/TileAnalogSection";
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
    stateDisplayValues: TileStateItem[];
    nameOverride?: string;
};

type LocationTileResourceProps = {
    kind: "resource";
    resource: TileRuntimeResource;
    state?: TileRuntimeResourceState;
    nameOverride?: string;
};

type LocationTileSceneProps = {
    kind: "scene";
    scene: RuntimeScene;
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

const LocationTileView: React.FC<LocationTileViewProps> = ({ view, active, stateDisplayValues, nameOverride }) => {
    const theme = useTheme();
    const sendCommand = useSendViewCommand();
    const hasCommand = !!view.command;
    const isAnalog = view.command?.type === "setAnalog";

    const { handleClick, pending } = useViewCommand(view, active, sendCommand);

    // Icon resolution
    const { IconComponent, iconColor, surfaceColor } = useViewIconColors(view.icon, active, theme);

    const displayName = nameOverride ?? view.name ?? view.id;

    const { analogSendCommand, analogState } = useViewAnalogState(view, sendCommand);

    const tileContent = (
        <TileContent
            icon={<IconComponent sx={{ fontSize: 40, color: iconColor, transition: "color 0.2s" }} />}
            stateValues={stateDisplayValues}
            displayName={displayName}
            hasAnalog={isAnalog}
        />
    );

    const analogSection = isAnalog && view.command && (
        <Box data-analog-section {...stopPropagation}>
            <TileAnalogSection
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

            {pending ? (
                <CircularProgress size={16} thickness={5} sx={{ position: "absolute", bottom: 11, right: 11 }} />
            ) : (
                <TechnicalLinkButton to={`/technical/views/${view.id}`} />
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

    // Resource interaction — complex resources get long-press callback to open panel
    const actions = useResourceAction(resource, state, {
        onLongPress: hasComplexPanel ? openComplexPanel : undefined,
    });

    // Icon/color
    const MainIcon = getResourceIcon(resource, state);
    const iconColor = getResourceIconColor(theme, resource, state);
    const surfaceColor = getResourceSurfaceColor(theme, resource);

    const displayName = nameOverride ?? resource.name;

    // Build flanking state values — only resource types that show a text value
    const resourceStateValues = useMemo((): TileStateItem[] => {
        if (!isReadOnly && !isTimer && !isComplex) return [];
        if (state?.value === undefined) return [];
        // Complex boolean resources show state via icon color, not text
        if (isComplex && typeof state.value === "boolean") return [];

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
            <TileAnalogSection
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
                    stateValues={[]}
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

