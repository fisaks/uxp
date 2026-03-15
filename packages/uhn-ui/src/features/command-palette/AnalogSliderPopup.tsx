import { Box, Dialog, DialogContent, DialogTitle, IconButton, Slider, useTheme } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { UhnResourceCommand } from "@uhn/common";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { useAnalogSlider } from "../resource/hooks/useAnalogSlider";
import { selectRuntimeStateById } from "../runtime-state/runtimeStateSelector";
import { useAnalogEditableInput } from "../shared/useAnalogEditableInput";
import { useSendViewCommand } from "../view/hooks/useSendViewCommand";
import { StepButtonRow } from "../shared/StepButtonRow";

type AnalogSliderPopupProps = {
    open: boolean;
    onClose: () => void;
    label: string;
    min: number;
    max: number;
    step: number;
    unit?: string;
    resourceId: string;
};

export const AnalogSliderPopup: React.FC<AnalogSliderPopupProps> = ({
    open, onClose, label, min, max, step, unit, resourceId,
}) => {
    const portalContainer = usePortalContainerRef();
    const theme = useTheme();
    const sendCommand = useSendViewCommand();

    // Current value from Redux
    const state = useSelector(selectRuntimeStateById(resourceId));

    const wrappedSendCommand = useCallback(
        (command: UhnResourceCommand) => sendCommand(resourceId, command),
        [sendCommand, resourceId],
    );

    const { localValue, handleChange, handleChangeCommitted, sendExact } =
        useAnalogSlider({ min, max }, state, wrappedSendCommand);

    const displayUnit = unit ?? "%";
    const bigStep = useMemo(() => Math.min(step * 10, (max - min) / 5), [step, min, max]);

    const { isEditing, inputRef, handleFocus, commitEdit, handleKeyDown } =
        useAnalogEditableInput(localValue, displayUnit, sendExact, { stopEscapePropagation: true });

    return (
        <Dialog
            open={open}
            onClose={onClose}
            container={portalContainer.current}
            maxWidth="xs"
            fullWidth
            sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
            slotProps={{ paper: { sx: { borderRadius: 3 } } }}
        >
            <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 0.5 }}>
                <Box component="span" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "1rem", fontWeight: 500 }}>
                    {label}
                </Box>
                <IconButton size="small" onClick={onClose} sx={{ ml: 1 }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, px: 1 }}>
                    <Slider
                        value={localValue}
                        min={min}
                        max={max}
                        step={step}
                        onChange={handleChange}
                        onChangeCommitted={handleChangeCommitted}
                        valueLabelDisplay="auto"
                        sx={{ flex: 1 }}
                    />
                    <input
                        ref={inputRef}
                        defaultValue={`${localValue}${displayUnit ? ` ${displayUnit}` : ""}`}
                        onFocus={handleFocus}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        inputMode="decimal"
                        readOnly={!isEditing}
                        style={{
                            fontFamily: "monospace",
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            color: theme.palette.primary.main,
                            background: "transparent",
                            border: "none",
                            borderBottom: isEditing
                                ? `1.5px solid ${theme.palette.primary.main}`
                                : "1.5px solid transparent",
                            outline: "none",
                            width: 56,
                            textAlign: "right",
                            padding: "2px 4px",
                            cursor: isEditing ? "text" : "pointer",
                            borderRadius: 4,
                        }}
                    />
                </Box>
                <Box sx={{ px: 1, pb: 1 }}>
                    <StepButtonRow
                        min={min} max={max} step={step} bigStep={bigStep}
                        localValue={localValue} sendExact={sendExact}
                        iconSize="medium" centerGap={2} mt={1}
                    />
                </Box>
            </DialogContent>
        </Dialog>
    );
};
