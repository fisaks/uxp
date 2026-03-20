import { Box, Slider } from "@mui/material";
import { UhnResourceCommand } from "@uhn/common";
import React from "react";
import { useAnalogSlider } from "../resource/hooks/useAnalogSlider";
import { TileRuntimeResourceState } from "../resource/resource-ui.type";
import { StepButtonRow } from "./StepButtonRow";
import { useAnalogEditableInput } from "./useAnalogEditableInput";

type TileAnalogSectionProps = {
    min: number;
    max: number;
    step: number;
    unit: string;
    iconColor: string;
    state: TileRuntimeResourceState | undefined;
    sendCommand: (command: UhnResourceCommand) => Promise<void>;
    disabled?: boolean;
};

export const TileAnalogSection: React.FC<TileAnalogSectionProps> = ({
    min, max, step, unit, iconColor, state, sendCommand, disabled,
}) => {
    const { localValue, handleChange, handleChangeCommitted, sendExact } =
        useAnalogSlider({ min, max }, state, sendCommand);

    const bigStep = Math.min(step * 10, (max - min) / 5);

    const { isEditing, inputRef, handleFocus, commitEdit, handleKeyDown } =
        useAnalogEditableInput(localValue, unit, sendExact);

    return (
        <Box sx={{ px: 1.5, pb: 0.75, pt: 0.5, display: "flex", gap: 1 }}>
            {/* Left column: slider + step controls (aligned widths) */}
            <Box sx={{ flex: 1, minWidth: 0, ml: 1.25 }}>
                <Slider
                    value={localValue}
                    min={min}
                    max={max}
                    step={step}
                    disabled={disabled}
                    onChange={handleChange}
                    onChangeCommitted={handleChangeCommitted}
                    size="small"
                    sx={{
                        color: iconColor,
                        py: 0.5,
                        "@media (pointer: coarse)": { py: 0.5 },
                        "& .MuiSlider-thumb": { width: 14, height: 14, "@media (pointer: coarse)": { width: 20, height: 20 } },
                        "& .MuiSlider-rail": { opacity: 0.3 },
                    }}
                />
                <StepButtonRow
                    min={min} max={max} step={step} bigStep={bigStep}
                    localValue={localValue} sendExact={sendExact}
                    disabled={disabled}
                    iconSize="small" centerGap={1.5} mt={1}
                />
            </Box>
            {/* Right column: editable value — negative margin aligns input
               vertically with the slider track center. Fragile if MUI Slider
               internals or thumb size change. */}
            <Box sx={{ mt: -4, display: "flex", alignItems: "center" }}>
                <input
                    ref={inputRef}
                    defaultValue={`${localValue}${unit ? ` ${unit}` : ""}`}
                    onFocus={handleFocus}
                    onBlur={commitEdit}
                    onKeyDown={handleKeyDown}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    inputMode="decimal"
                    readOnly={!isEditing}
                    disabled={disabled}
                    style={{
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: iconColor,
                        background: "transparent",
                        border: "none",
                        borderBottom: isEditing ? `1.5px solid ${iconColor}` : "1.5px solid transparent",
                        outline: "none",
                        width: 48,
                        textAlign: "right",
                        padding: "0 2px",
                        cursor: isEditing ? "text" : "pointer",
                        borderRadius: 4,
                    }}
                />
            </Box>
        </Box>
    );
};
