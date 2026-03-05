import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import { Box, IconButton, Popover, Slider, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useCallback, useRef, useState } from "react";
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
        useAnalogSlider(resource, state, sendCommand);

    const min = resource.min ?? 0;
    const max = resource.max ?? 65535;
    const step = resource.step ?? 1;
    const unit = resource.unit ?? "";

    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const iconColor = getResourceIconColor(theme, resource, state);
    const MainIcon = getResourceIcon(resource, state);

    const handleValueClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setEditValue(String(localValue));
        setIsEditing(true);
        // Focus the input after render
        setTimeout(() => inputRef.current?.select(), 0);
    }, [localValue]);

    const commitEdit = useCallback(() => {
        setIsEditing(false);
        const parsed = parseFloat(editValue);
        if (!isNaN(parsed)) {
            sendExact(parsed);
        }
    }, [editValue, sendExact]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            commitEdit();
        } else if (e.key === "Escape") {
            e.stopPropagation();
            setIsEditing(false);
        }
    }, [commitEdit]);

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
                {React.cloneElement(MainIcon, {
                    sx: { color: iconColor, fontSize: 20 },
                })}
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {resource.name}
                </Typography>
            </Box>

            {/* Slider + value */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Slider
                    value={localValue}
                    min={min}
                    max={max}
                    step={step}
                    onChange={handleChange}
                    onChangeCommitted={handleChangeCommitted}
                    sx={{
                        flex: 1,
                        color: iconColor,
                        "& .MuiSlider-thumb": {
                            width: 18,
                            height: 18,
                        },
                    }}
                />

                {isEditing ? (
                    <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                        inputMode="decimal"
                        style={{
                            fontFamily: "monospace",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: iconColor,
                            background: "transparent",
                            border: "none",
                            borderBottom: `1.5px solid ${iconColor}`,
                            outline: "none",
                            width: 48,
                            textAlign: "right",
                            padding: "0 4px",
                        }}
                    />
                ) : (
                    <Typography
                        variant="caption"
                        onClick={handleValueClick}
                        sx={{
                            fontFamily: "monospace",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: iconColor,
                            cursor: "pointer",
                            minWidth: 48,
                            textAlign: "right",
                            userSelect: "none",
                            borderRadius: 1,
                            px: 0.5,
                            "&:hover": {
                                backgroundColor: "action.hover",
                            },
                        }}
                    >
                        {localValue}{unit ? ` ${unit}` : ""}
                    </Typography>
                )}
            </Box>

            {/* Step controls: [min] « - + » [max] */}
            <Box sx={{ display: "flex", alignItems: "center", mt: 0.75 }}>
                {resource.min !== undefined ? (
                    <Typography
                        variant="caption"
                        onClick={() => sendExact(min)}
                        sx={{ cursor: "pointer", fontFamily: "monospace", fontWeight: 600, fontSize: "0.7rem", color: "text.secondary", px: 0.5, borderRadius: 1, userSelect: "none", "&:hover": { backgroundColor: "action.hover" } }}
                    >
                        {min}{unit ? ` ${unit}` : ""}
                    </Typography>
                ) : <Box />}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, flex: 1 }}>
                    <IconButton size="small" onClick={() => sendExact(localValue - step * 10)} sx={{ p: 0.25 }}>
                        <ChevronLeftIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => sendExact(localValue - step)} sx={{ p: 0.25 }}>
                        <RemoveIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => sendExact(localValue + step)} sx={{ p: 0.25 }}>
                        <AddIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => sendExact(localValue + step * 10)} sx={{ p: 0.25 }}>
                        <ChevronRightIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>
                {resource.max !== undefined ? (
                    <Typography
                        variant="caption"
                        onClick={() => sendExact(max)}
                        sx={{ cursor: "pointer", fontFamily: "monospace", fontWeight: 600, fontSize: "0.7rem", color: "text.secondary", px: 0.5, borderRadius: 1, userSelect: "none", "&:hover": { backgroundColor: "action.hover" } }}
                    >
                        {max}{unit ? ` ${unit}` : ""}
                    </Typography>
                ) : <Box />}
            </Box>
        </Popover>
    );
};
