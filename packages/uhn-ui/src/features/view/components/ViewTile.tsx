import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import { alpha, Box, Card, CardActionArea, CircularProgress, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { RuntimeInteractionView, RuntimeViewCommandTarget } from "@uhn/common";
import React, { useCallback, useMemo, useState } from "react";
import { getBlueprintIcon } from "../blueprintIconMap";
import { useSendViewCommand } from "../hooks/useSendViewCommand";
import { StateDisplayValue } from "../viewSelectors";
import { FlashItem, IndicatorItem, ViewValueDisplay } from "./ViewStateDisplay";

type ViewTileProps = {
    view: RuntimeInteractionView;
    active: boolean;
    stateDisplayValues: StateDisplayValue[];
};

export const ViewTile: React.FC<ViewTileProps> = ({ view, active, stateDisplayValues }) => {
    const theme = useTheme();
    const sendCommand = useSendViewCommand();
    const hasCommand = !!view.command;
    const [pending, setPending] = useState(false);

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

    const displayName = view.name ?? view.id;

    const content = (
        <Box sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 2,
            px: 1,
            minHeight: 120,
        }}>
            {/* Main icon + flash badges wrapper */}
            <Box sx={{ position: "relative", mb: 1 }}>
                <IconComponent sx={{
                    fontSize: 48,
                    color: iconColor,
                    transition: "color 0.2s, transform 0.15s",
                }} />
                {/* Flash badges — centered row below the main icon */}
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
            <Typography
                variant="body2"
                align="center"
                sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    minHeight: "2.4em",
                    lineHeight: "1.2em",
                }}
            >
                {displayName}
            </Typography>
            <ViewValueDisplay items={stateDisplayValues} />
        </Box>
    );

    return (
        <Card
            variant="outlined"
            sx={{
                position: "relative",
                borderRadius: 3,
                boxShadow: 2,
                backgroundColor: surfaceColor,
                transition: "background-color 0.3s, box-shadow 0.2s",
                "&:hover": hasCommand ? {
                    boxShadow: 4,
                } : undefined,
            }}
        >
            {/* Indicators — top-right corner */}
            {indicators.length > 0 && (
                <Box sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
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
                <CardActionArea onClick={handleClick} disabled={pending}>
                    {content}
                </CardActionArea>
            ) : (
                content
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
