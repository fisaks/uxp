import { Box, IconButton, Slider, Switch, type SvgIconProps, Typography } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import { useTheme } from "@mui/material/styles";
import { RuntimeViewCommand, UhnResourceCommand } from "@uhn/common";
import { assertNever } from "@uxp/common";
import React, { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { selectRuntimeStateByResourceId } from "../../runtime-state/runtimeStateSelector";
import { useAnalogSlider } from "../../resource/hooks/useAnalogSlider";
import { sendForTarget } from "../../shared/viewCommandHelpers";

type SendCommandFn = (resourceId: string, command: UhnResourceCommand) => Promise<void>;
type IconComponent = React.ComponentType<SvgIconProps>;

type ViewCommandSlots = {
    /** Compact control for the title row (tap/toggle/longPress/clearTimer) */
    titleAction: React.ReactNode;
    /** Full-width content below the title (setAnalog slider), or null */
    headerContent: React.ReactNode;
};

/** Returns the view command rendered into two slots:
 *  - titleAction: inline with the popover title (button/switch controls)
 *  - headerContent: below the title row (analog slider)
 *  Uses the view command path (same as tile tap) — NOT raw resource press/release. */
export function useViewCommandSlots(
    command: RuntimeViewCommand | undefined,
    active: boolean,
    sendCommand: SendCommandFn,
    Icon?: IconComponent,
    iconColor?: string,
): ViewCommandSlots {
    const theme = useTheme();
    const resolvedIconColor = iconColor ?? (active ? theme.palette.primary.main : theme.palette.text.secondary);

    if (!command) return { titleAction: null, headerContent: null };

    switch (command.type) {
        case "tap":
            return {
                titleAction: <TapControl command={command} sendCommand={sendCommand} active={active} iconColor={resolvedIconColor} Icon={Icon} />,
                headerContent: null,
            };
        case "toggle":
            return {
                titleAction: <ToggleControl command={command} sendCommand={sendCommand} active={active} />,
                headerContent: null,
            };
        case "longPress":
            return {
                titleAction: <LongPressControl command={command} sendCommand={sendCommand} active={active} iconColor={resolvedIconColor} Icon={Icon} />,
                headerContent: null,
            };
        case "setAnalog":
            return {
                titleAction: null,
                headerContent: <SetAnalogControl command={command} sendCommand={sendCommand} iconColor={resolvedIconColor} />,
            };
        case "clearTimer":
            return {
                titleAction: <ClearTimerControl command={command} sendCommand={sendCommand} iconColor={resolvedIconColor} />,
                headerContent: null,
            };
        default:
            assertNever(command.type);
    }
}

/* ------------------------------------------------------------------ */
/* Type-specific command controls                                      */
/* ------------------------------------------------------------------ */

const TapControl: React.FC<{
    command: RuntimeViewCommand;
    sendCommand: SendCommandFn;
    active: boolean;
    iconColor: string;
    Icon?: IconComponent;
}> = ({ command, sendCommand, active, iconColor, Icon }) => {
    const [pending, setPending] = useState(false);

    const handleTap = useCallback(async () => {
        setPending(true);
        try {
            const target = (active && command.onDeactivate) ? command.onDeactivate : command;
            await sendForTarget(target, sendCommand, active);
        } finally {
            setPending(false);
        }
    }, [command, sendCommand, active]);

    const ButtonIcon = Icon ?? TouchAppIcon;

    return (
        <IconButton
            size="small"
            onClick={handleTap}
            disabled={pending}
            sx={{
                color: active ? iconColor : "action.disabled",
                border: 1,
                borderColor: active ? iconColor : "divider",
                p: 0.5,
            }}
        >
            <ButtonIcon sx={{ fontSize: 16 }} />
        </IconButton>
    );
};

const ToggleControl: React.FC<{
    command: RuntimeViewCommand;
    sendCommand: SendCommandFn;
    active: boolean;
}> = ({ command, sendCommand, active }) => {
    const handleToggle = useCallback(async () => {
        const target = (active && command.onDeactivate) ? command.onDeactivate : command;
        await sendForTarget(target, sendCommand, active);
    }, [command, sendCommand, active]);

    return (
        <Switch
            size="small"
            checked={active}
            onChange={handleToggle}
        />
    );
};

const LongPressControl: React.FC<{
    command: RuntimeViewCommand;
    sendCommand: SendCommandFn;
    active: boolean;
    iconColor: string;
    Icon?: IconComponent;
}> = ({ command, sendCommand, active, iconColor, Icon }) => {
    const [pending, setPending] = useState(false);

    const handlePress = useCallback(async () => {
        setPending(true);
        try {
            const target = (active && command.onDeactivate) ? command.onDeactivate : command;
            await sendForTarget(target, sendCommand, active);
        } finally {
            setPending(false);
        }
    }, [command, sendCommand, active]);

    const ButtonIcon = Icon ?? TouchAppIcon;

    return (
        <IconButton
            size="small"
            onClick={handlePress}
            disabled={pending}
            sx={{
                color: active ? iconColor : "action.disabled",
                border: 1,
                borderColor: active ? iconColor : "divider",
                p: 0.5,
            }}
        >
            <ButtonIcon sx={{ fontSize: 16 }} />
        </IconButton>
    );
};

const SetAnalogControl: React.FC<{
    command: RuntimeViewCommand;
    sendCommand: SendCommandFn;
    iconColor: string;
}> = ({ command, sendCommand, iconColor }) => {
    const runtimeStateById = useSelector(selectRuntimeStateByResourceId);
    const state = runtimeStateById[command.resourceId];

    const analogSendCommand = useCallback(async (cmd: UhnResourceCommand) => {
        await sendCommand(command.resourceId, cmd);
    }, [sendCommand, command.resourceId]);

    const min = command.min ?? 0;
    const max = command.max ?? 100;
    const step = command.step ?? 1;
    const unit = command.unit ?? "";

    const { localValue, handleChange, handleChangeCommitted } =
        useAnalogSlider({ min, max }, state, analogSendCommand);

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Slider
                value={localValue}
                min={min}
                max={max}
                step={step}
                size="small"
                onChange={handleChange}
                onChangeCommitted={handleChangeCommitted}
                sx={{ flex: 1, color: iconColor }}
            />
            <Typography
                variant="caption"
                sx={{
                    fontFamily: "monospace",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: iconColor,
                    minWidth: 36,
                    textAlign: "right",
                }}
            >
                {localValue}{unit ? ` ${unit}` : ""}
            </Typography>
        </Box>
    );
};

const ClearTimerControl: React.FC<{
    command: RuntimeViewCommand;
    sendCommand: SendCommandFn;
    iconColor: string;
}> = ({ command, sendCommand, iconColor }) => {
    const handleClear = useCallback(async () => {
        await sendCommand(command.resourceId, { type: "clearTimer" });
    }, [command.resourceId, sendCommand]);

    return (
        <IconButton
            size="small"
            onClick={handleClear}
            sx={{
                color: iconColor,
                border: 1,
                borderColor: "divider",
                p: 0.5,
            }}
        >
            <ClearIcon sx={{ fontSize: 16 }} />
        </IconButton>
    );
};
