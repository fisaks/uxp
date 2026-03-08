import DescriptionIcon from "@mui/icons-material/Description";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, Card, CardActionArea, CircularProgress, IconButton, Popover, Tooltip, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { RuntimeInteractionView } from "@uhn/common";
import React, { useMemo, useState } from "react";
import { TileAnalogSection } from "../../shared/TileAnalogSection";
import { createTooltipProps, stopPropagation } from "../../shared/tileEventHelpers";
import { useViewAnalogState } from "../../shared/useViewAnalogState";
import { useViewCommand } from "../../shared/useViewCommand";
import { useViewIconColors } from "../../shared/useViewIconColors";
import { useSendViewCommand } from "../hooks/useSendViewCommand";
import { StateDisplayValue } from "../viewSelectors";
import { TileContent } from "../../shared/TileContent";
import { IndicatorItem } from "./ViewStateDisplay";

type ViewTileProps = {
    view: RuntimeInteractionView;
    active: boolean;
    stateDisplayValues: StateDisplayValue[];
    nameOverride?: string;
};

export const ViewTile: React.FC<ViewTileProps> = ({ view, active, stateDisplayValues, nameOverride }) => {
    const theme = useTheme();
    const portalContainer = usePortalContainerRef();
    const sendCommand = useSendViewCommand();
    const hasCommand = !!view.command;
    const isAnalog = view.command?.type === "setAnalog";
    const [infoAnchor, setInfoAnchor] = useState<null | HTMLElement>(null);
    const [descAnchor, setDescAnchor] = useState<null | HTMLElement>(null);

    const tooltipProps = createTooltipProps(portalContainer.current);

    const indicators = useMemo(() => stateDisplayValues.filter(i => i.style === "indicator"), [stateDisplayValues]);
    const flashItems = useMemo(() => stateDisplayValues.filter(i => i.style === "flash"), [stateDisplayValues]);

    const { handleClick, pending } = useViewCommand(view, active, sendCommand);

    const { IconComponent, iconColor, surfaceColor } = useViewIconColors(view.icon, active, theme);

    const displayName = nameOverride ?? view.name ?? view.id;

    const { analogSendCommand, analogState } = useViewAnalogState(view, sendCommand);

    const content = (
        <TileContent
            icon={<IconComponent sx={{ fontSize: 40, color: iconColor, transition: "color 0.2s, transform 0.15s" }} />}
            flashItems={flashItems}
            stateValues={stateDisplayValues}
            displayName={displayName}
            hasAnalog={isAnalog}
            pt="28px"
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
