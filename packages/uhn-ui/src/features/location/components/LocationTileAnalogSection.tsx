import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import LastPageIcon from "@mui/icons-material/LastPage";
import RemoveIcon from "@mui/icons-material/Remove";
import { Box, IconButton, Slider } from "@mui/material";
import { UhnResourceCommand } from "@uhn/common";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAnalogSlider } from "../../resource/hooks/useAnalogSlider";
import { TileRuntimeResourceState } from "../../resource/resource-ui.type";

type LocationTileAnalogSectionProps = {
    min: number;
    max: number;
    step: number;
    unit: string;
    iconColor: string;
    state: TileRuntimeResourceState | undefined;
    sendCommand: (command: UhnResourceCommand) => Promise<void>;
};

export const LocationTileAnalogSection: React.FC<LocationTileAnalogSectionProps> = ({
    min, max, step, unit, iconColor, state, sendCommand,
}) => {
    const { localValue, handleChange, handleChangeCommitted, sendExact } =
        useAnalogSlider({ min, max }, state, sendCommand);

    const bigStep = Math.min(step * 10, (max - min) / 5);

    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync displayed value when not editing
    useEffect(() => {
        if (!isEditing && inputRef.current) {
            inputRef.current.value = `${localValue}${unit ? ` ${unit}` : ""}`;
        }
    }, [localValue, unit, isEditing]);

    const handleFocus = useCallback(() => {
        setIsEditing(true);
        // Set the input value to current on focus so user can edit it
        if (inputRef.current) {
            inputRef.current.value = String(localValue);
            inputRef.current.select();
        }
    }, [localValue]);

    const commitEdit = useCallback(() => {
        setIsEditing(false);
        const parsed = parseFloat(inputRef.current?.value ?? "");
        if (!isNaN(parsed)) {
            sendExact(parsed);
        }
    }, [sendExact]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            inputRef.current?.blur();
        } else if (e.key === "Escape") {
            setIsEditing(false);
            if (inputRef.current) inputRef.current.value = String(localValue);
            inputRef.current?.blur();
        }
    }, [localValue]);

    return (
        <Box sx={{ px: 1.5, pb: 0.75, pt: 0.5, display: "flex", gap: 1 }}>
            {/* Left column: slider + step controls (aligned widths) */}
            <Box sx={{ flex: 1, minWidth: 0, ml: "10px" }}>
                <Slider
                    value={localValue}
                    min={min}
                    max={max}
                    step={step}
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
                {/* Step controls: [min] « - + » [max] */}
                <Box sx={{ display: "flex", alignItems: "center", flexWrap: "nowrap", mt: 1 }}>
                    <IconButton size="small" onClick={() => sendExact(min)} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                        <FirstPageIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => sendExact(localValue - bigStep)} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                        <ChevronLeftIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <Box sx={{ flex: 1, display: "flex", justifyContent: "center", gap: 1.5 }}>
                        <IconButton size="small" onClick={() => sendExact(localValue - step)} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                            <RemoveIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => sendExact(localValue + step)} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                            <AddIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                    </Box>
                    <IconButton size="small" onClick={() => sendExact(localValue + bigStep)} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                        <ChevronRightIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => sendExact(max)} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                        <LastPageIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Box>
            </Box>
            {/* Right column: editable value — aligned with slider track */}
            <Box sx={{ pt: 0, mt: "-32px", display: "flex", alignItems: "center" }}>
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
