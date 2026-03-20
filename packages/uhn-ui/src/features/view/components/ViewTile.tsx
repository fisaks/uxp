import { Box, Card, CardActionArea, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { RuntimeInteractionView } from "@uhn/common";
import React, { useCallback, useRef, useState } from "react";
import { SubResourcePopover } from "../../shared/SubResourcePopover";
import { TileAnalogSection } from "../../shared/TileAnalogSection";
import { TuneOverlayIcon } from "../../shared/TuneOverlayIcon";
import { TileContent } from "../../shared/TileContent";
import { TileDescriptionPopover } from "../../shared/TileDescriptionPopover";
import { TileInfoPopover } from "../../shared/TileInfoPopover";
import { TilePendingIndicator } from "../../shared/TilePendingIndicator";
import { TechnicalDeepLink } from "../../shared/TechnicalDeepLink";
import { stopPropagation } from "../../shared/tileEventHelpers";
import { TileStateItem } from "../../shared/tile.types";
import { useViewAnalogState } from "../../shared/useViewAnalogState";
import { useViewCommand } from "../../shared/useViewCommand";
import { useViewIconColors } from "../../shared/useViewIconColors";
import { useSendViewCommand } from "../hooks/useSendViewCommand";
import { useViewCommandSlots } from "./ViewCommandControl";

type ViewTileProps = {
    view: RuntimeInteractionView;
    active: boolean;
    stateDisplayValues: TileStateItem[];
    nameOverride?: string;
};

export const ViewTile: React.FC<ViewTileProps> = ({ view, active, stateDisplayValues, nameOverride }) => {
    const theme = useTheme();
    const sendCommand = useSendViewCommand();
    const hasCommand = !!view.command;
    const isAnalog = view.command?.type === "setAnalog";

    const { handleClick, pending } = useViewCommand(view, active, sendCommand);

    const { IconComponent, iconColor, surfaceColor } = useViewIconColors(view.icon, active, theme);

    const displayName = nameOverride ?? view.name ?? view.id;

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
            <IconComponent sx={{ fontSize: 40, color: iconColor, transition: "color 0.2s, transform 0.15s" }} />
        </TuneOverlayIcon>
    );

    const content = (
        <TileContent
            icon={iconElement}
            onIconClick={hasPopover ? openControls : undefined}
            stateValues={stateDisplayValues}
            displayName={displayName}
            hasAnalog={showAnalog}
            pt={3.5}
        />
    );

    // Analog section: from command setAnalog OR inline control
    const analogSection = showAnalog && (
        <Box data-analog-section {...stopPropagation}>
            {isAnalog && view.command ? (
                <TileAnalogSection
                    min={view.command.min ?? 0}
                    max={view.command.max ?? 100}
                    step={view.command.step ?? 1}
                    unit={view.command.unit ?? ""}
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
                    iconColor={iconColor}
                    state={inlineAnalogState}
                    sendCommand={inlineAnalogSendCommand}
                    disabled={!active}
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
            <TileInfoPopover>
                <Typography variant="subtitle2">View Details</Typography>
                <Typography variant="body2">ID: {view.id}</Typography>
                {view.command && <Typography variant="body2">Command: {view.command.type}</Typography>}
                {view.command && (
                    <Typography variant="body2">Target:{" "}
                        <TechnicalDeepLink to={`/technical/resources/${view.command.resourceId}`}>
                            {view.command.resourceId}
                        </TechnicalDeepLink>
                    </Typography>
                )}
                {view.stateFrom.length > 0 && (
                    <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2">State from:</Typography>
                        {view.stateFrom.map((s, i) => (
                            <Typography key={i} variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                                <TechnicalDeepLink to={`/technical/resources/${s.resourceId}`}>
                                    {s.resourceId}
                                </TechnicalDeepLink>
                            </Typography>
                        ))}
                    </Box>
                )}
                {view.stateAggregation && <Typography variant="body2">Aggregation: {view.stateAggregation}</Typography>}
                {view.controls && view.controls.length > 0 && (
                    <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2">Controls ({view.controls.length}):</Typography>
                        {view.controls.map((c, i) => (
                            <Typography key={i} variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                                <TechnicalDeepLink to={`/technical/resources/${c.resourceId}`}>
                                    {c.resourceId}
                                </TechnicalDeepLink>
                                {c.inline ? " (inline)" : ""}
                            </Typography>
                        ))}
                    </Box>
                )}
            </TileInfoPopover>

            {/* Description icon — top-right */}
            <TileDescriptionPopover description={view.description} />

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
                    {content}
                    {analogSection}
                </CardActionArea>
            ) : (
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    {content}
                    {analogSection}
                </Box>
            )}

            <TilePendingIndicator pending={pending} />

            {/* Controls popover */}
            {hasPopover && view.controls && (
                <SubResourcePopover
                    items={view.controls}
                    title={displayName}
                    anchorEl={controlsAnchor}
                    onClose={closeControls}
                    titleAction={commandSlots.titleAction}
                    headerContent={commandSlots.headerContent}
                    disabled={!active}
                />
            )}
        </Card>
    );
};
