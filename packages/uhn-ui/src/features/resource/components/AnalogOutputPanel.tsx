import { Box, Popover, Slider, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React from "react";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";
import { useAnalogSlider } from "../hooks/useAnalogSlider";
import { useSendResourceCommand } from "../hooks/useSendResourceCommand";
import { AnalogSelectControl } from "../../shared/AnalogSelectControl";
import { StepButtonRow } from "../../shared/StepButtonRow";
import { useAnalogEditableInput } from "../../shared/useAnalogEditableInput";
import { getResourceIcon } from "./icons";
import { getResourceIconColor } from "./colors";

type AnalogOutputPanelProps = {
    resource: TileRuntimeResource;
    state?: TileRuntimeResourceState;
    anchorEl: HTMLElement | null;
    onClose: () => void;
};

/** Standalone popover for analogOutput / virtualAnalogOutput resource tiles.
 *  Opened by tile-extensions when the user taps an analog resource tile.
 *  Shows a slider (or AnalogSelectControl when `resource.options` is set). */
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

    const iconColor = getResourceIconColor(theme, resource, state);
    const MainIcon = getResourceIcon(resource, state);

    const { isEditing, inputRef, handleFocus, commitEdit, handleKeyDown } =
        useAnalogEditableInput(localValue, unit, sendExact, { stopEscapePropagation: true });

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

            {/* Control: select dropdown for discrete options, slider for continuous */}
            {resource.options && resource.options.length > 0 ? (
                <AnalogSelectControl
                    options={resource.options}
                    value={localValue}
                    onChange={sendExact}
                    iconColor={iconColor}
                />
            ) : (
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
                        <StepButtonRow
                            min={min} max={max} step={step} bigStep={bigStep}
                            localValue={localValue} sendExact={sendExact}
                            iconSize="medium" centerGap={2} mt={0.75}
                        />
                    </Box>
                    {/* Right column: editable value — negative margin aligns input
                       vertically with the slider track center. Fragile if MUI Slider
                       internals or thumb size change. Does not map to 8px grid. */}
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
            )}
        </Popover>
    );
};
