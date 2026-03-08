import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import LastPageIcon from "@mui/icons-material/LastPage";
import RemoveIcon from "@mui/icons-material/Remove";
import { Box, IconButton, Popover, Slider, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";
import { useAnalogSlider } from "../hooks/useAnalogSlider";
import { useSendResourceCommand } from "../hooks/useSendResourceCommand";
import { getResourceIcon } from "./icons";
import { getResourceIconColor } from "./colors";

type AnalogOutputPanelProps = {
    resource: TileRuntimeResource;
    state?: TileRuntimeResourceState;
    anchorEl: HTMLElement | null;
    onClose: () => void;
};

export const AnalogOutputPanel: React.FC<AnalogOutputPanelProps> = ({
    resource,
    state,
    anchorEl,
    onClose,
}) => {
    const theme = useTheme();
    const portalContainer = usePortalContainerRef();
    const sendCommand = useSendResourceCommand(resource.id);
    const { localValue, handleChange, handleChangeCommitted, sendExact } =
        useAnalogSlider({ min: resource.min, max: resource.max }, state, sendCommand);

    const min = resource.min ?? 0;
    const max = resource.max ?? 65535;
    const step = resource.step ?? 1;
    const bigStep = Math.min(step * 10, (max - min) / 5);
    const unit = resource.unit ?? "";

    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const iconColor = getResourceIconColor(theme, resource, state);
    const MainIcon = getResourceIcon(resource, state);

    // Sync displayed value when not editing
    useEffect(() => {
        if (!isEditing && inputRef.current) {
            inputRef.current.value = `${localValue}${unit ? ` ${unit}` : ""}`;
        }
    }, [localValue, unit, isEditing]);

    const handleFocus = useCallback(() => {
        setIsEditing(true);
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
            e.stopPropagation();
            setIsEditing(false);
            if (inputRef.current) inputRef.current.value = String(localValue);
            inputRef.current?.blur();
        }
    }, [localValue]);

    const open = Boolean(anchorEl);

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            container={portalContainer.current}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
            slotProps={{
                paper: {
                    sx: { width: 300, p: 2 },
                },
            }}
        >
            {/* Header: icon + name */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <MainIcon sx={{ color: iconColor, fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {resource.name}
                </Typography>
            </Box>

            {/* Slider + step controls (left) / value (right) */}
            <Box sx={{ display: "flex", gap: 1 }}>
                {/* Left column: slider + step controls */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Slider
                        value={localValue}
                        min={min}
                        max={max}
                        step={step}
                        onChange={handleChange}
                        onChangeCommitted={handleChangeCommitted}
                        sx={{
                            color: iconColor,
                            "& .MuiSlider-thumb": {
                                width: 18,
                                height: 18,
                            },
                        }}
                    />
                    {/* Step controls: [min] « [- +] » [max] */}
                    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "nowrap", mt: 0.75 }}>
                        <IconButton size="small" onClick={() => sendExact(min)} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                            <FirstPageIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => sendExact(localValue - bigStep)} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                            <ChevronLeftIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <Box sx={{ flex: 1, display: "flex", justifyContent: "center", gap: 2 }}>
                            <IconButton size="small" onClick={() => sendExact(localValue - step)} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                                <RemoveIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton size="small" onClick={() => sendExact(localValue + step)} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                                <AddIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Box>
                        <IconButton size="small" onClick={() => sendExact(localValue + bigStep)} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                            <ChevronRightIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => sendExact(max)} sx={{ p: 0.5, "&:hover": { backgroundColor: "action.hover" } }}>
                            <LastPageIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Box>
                </Box>
                {/* Right column: editable value — aligned with slider track */}
                <Box sx={{ display: "flex", alignItems: "center", mt: "-37px" }}>
                    <input
                        ref={inputRef}
                        defaultValue={`${localValue}${unit ? ` ${unit}` : ""}`}
                        onFocus={handleFocus}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
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
        </Popover>
    );
};
