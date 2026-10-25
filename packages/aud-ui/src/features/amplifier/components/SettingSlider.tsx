import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { Box, IconButton, Slider, Stack, Typography } from "@mui/material";
import React from "react";
import { useDebouncedSlider } from "../useDebouncedSlider";

type SettingSliderProps = {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    format: (value: number) => string;
    disabled: boolean;
    onSend: (value: number) => void;
};

/**
 * A labelled slider that shows its value and sends it while it is dragged, like the volume.
 * The buttons at the ends move it one step, which is easier than dragging on a touch screen.
 */
export const SettingSlider: React.FC<SettingSliderProps> = ({ label, value, min, max, step, format, disabled, onSend }) => {
    const { localValue, handleChange, handleChangeCommitted, sendExact } = useDebouncedSlider(value, min, max, onSend);

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography variant="body2">{label}</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                    {format(localValue)}
                </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
                <IconButton
                    disabled={disabled || localValue <= min}
                    onClick={() => sendExact(localValue - step)}
                    aria-label={`Decrease ${label}`}
                >
                    <RemoveIcon fontSize="small" />
                </IconButton>
                <Box sx={{ flex: 1, minWidth: 0, px: 1 }}>
                    <Slider
                        value={localValue}
                        min={min}
                        max={max}
                        step={step}
                        disabled={disabled}
                        onChange={handleChange}
                        onChangeCommitted={handleChangeCommitted}
                        size="small"
                        aria-label={label}
                    />
                </Box>
                <IconButton
                    disabled={disabled || localValue >= max}
                    onClick={() => sendExact(localValue + step)}
                    aria-label={`Increase ${label}`}
                >
                    <AddIcon fontSize="small" />
                </IconButton>
            </Stack>
        </Box>
    );
};
