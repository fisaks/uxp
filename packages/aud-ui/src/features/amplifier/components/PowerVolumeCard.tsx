import { AmplifierInfo, AmplifierStatus } from "@aud/common";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RemoveIcon from "@mui/icons-material/Remove";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { Box, Card, CardContent, IconButton, Slider, Stack, Switch, Typography } from "@mui/material";
import { TooltipIconButton, usePortalContainerRef } from "@uxp/ui-lib";
import React, { useCallback } from "react";
import { SendAmplifierCommand } from "../useAmplifierCommand";
import { useEditableNumberInput } from "../useEditableNumberInput";
import { useDebouncedSlider } from "../useDebouncedSlider";

const VOLUME_BIG_STEP_DB = 5;
const TOOLTIP_ENTER_DELAY = 1000;

const formatEdge = (volumeDb: number) => `${volumeDb > 0 ? "+" : ""}${volumeDb} dB`;

type PowerVolumeCardProps = {
    info: AmplifierInfo;
    status: AmplifierStatus;
    disabled: boolean;
    send: SendAmplifierCommand;
};

export const PowerVolumeCard: React.FC<PowerVolumeCardProps> = ({ info, status, disabled, send }) => {
    const portalContainer = usePortalContainerRef();
    const sendVolume = useCallback((volumeDb: number) => send("amplifier_set_volume", { volumeDb }), [send]);
    const { localValue, handleChange, handleChangeCommitted, sendExact } = useDebouncedSlider(
        status.volumeDb,
        info.volume.min,
        info.volume.max,
        sendVolume
    );
    // A typed number keeps the sign of the current volume, so "15" is -15 dB while the volume is negative.
    // The sign is flipped by typing it, "+5" or "-5". A mistyped sign would otherwise jump to a very loud volume.
    const sendTyped = useCallback(
        (value: number, text: string) => {
            const typedSign = text.trim().charAt(0);
            const negative = typedSign === "-" || typedSign === "+" ? typedSign === "-" : localValue <= 0;
            sendExact(negative ? -Math.abs(value) || 0 : Math.abs(value));
        },
        [sendExact, localValue]
    );
    const { isEditing, inputRef, handleFocus, commitEdit, handleKeyDown } = useEditableNumberInput(localValue, "dB", sendTyped);

    const stepButton = (label: string, change: number, icon: React.ReactNode) => (
        <TooltipIconButton
            component="span"
            size="small"
            disabled={disabled}
            onClick={() => sendExact(localValue + change)}
            sx={{ p: 0.5 }}
            tooltip={label}
            tooltipPortal={portalContainer}
            enterDelay={TOOLTIP_ENTER_DELAY}
        >
            {icon}
        </TooltipIconButton>
    );

    return (
        <Card>
            <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">Power</Typography>
                    <Switch
                        checked={status.power}
                        disabled={disabled}
                        onChange={(_event, on) => send("amplifier_set_power", { on })}
                        slotProps={{ input: { "aria-label": "Power" } }}
                    />
                </Stack>
                <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ mt: 2 }}>
                    <Typography variant="h6">Volume</Typography>
                    {/* The value is typed directly into this input: click it, enter a number in dB and press Enter. */}
                    <input
                        ref={inputRef}
                        defaultValue={`${localValue} dB`}
                        onFocus={handleFocus}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                        inputMode="decimal"
                        readOnly={!isEditing}
                        disabled={disabled}
                        aria-label="Volume in dB"
                        style={{
                            fontFamily: "monospace",
                            fontSize: "1.25rem",
                            fontWeight: 600,
                            color: "inherit",
                            background: "transparent",
                            border: "none",
                            borderBottom: isEditing ? "1.5px solid currentColor" : "1.5px solid transparent",
                            outline: "none",
                            width: 100,
                            padding: "0 2px",
                            cursor: isEditing ? "text" : "pointer",
                        }}
                    />
                </Stack>
                {/* The range labels, the slider and the step buttons share the first column, the mute button sits next to the slider. */}
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", columnGap: 2, alignItems: "center" }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ gridColumn: 1, gridRow: 1, mb: -1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", lineHeight: 1 }}>
                            {formatEdge(info.volume.min)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", lineHeight: 1 }}>
                            {formatEdge(info.volume.max)}
                        </Typography>
                    </Stack>
                    <Slider
                        sx={{ gridColumn: 1, gridRow: 2 }}
                        value={localValue}
                        min={info.volume.min}
                        max={info.volume.max}
                        step={info.volume.step}
                        disabled={disabled}
                        onChange={handleChange}
                        onChangeCommitted={handleChangeCommitted}
                        aria-label="Volume"
                    />
                    <IconButton
                        sx={{ gridColumn: 2, gridRow: 2 }}
                        color={status.muted ? "warning" : "default"}
                        disabled={disabled}
                        onClick={() => send("amplifier_set_mute", { muted: !status.muted })}
                        aria-label={status.muted ? "Unmute" : "Mute"}
                    >
                        {status.muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                    </IconButton>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ gridColumn: 1, gridRow: 3 }}>
                        {stepButton(`−${VOLUME_BIG_STEP_DB} dB`, -VOLUME_BIG_STEP_DB, <ChevronLeftIcon fontSize="small" />)}
                        <Stack direction="row" spacing={1}>
                            {stepButton(`−${info.volume.step} dB`, -info.volume.step, <RemoveIcon fontSize="small" />)}
                            {stepButton(`+${info.volume.step} dB`, info.volume.step, <AddIcon fontSize="small" />)}
                        </Stack>
                        {stepButton(`+${VOLUME_BIG_STEP_DB} dB`, VOLUME_BIG_STEP_DB, <ChevronRightIcon fontSize="small" />)}
                    </Stack>
                </Box>
            </CardContent>
        </Card>
    );
};
