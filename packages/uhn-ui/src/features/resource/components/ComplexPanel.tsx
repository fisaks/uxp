import { Box, IconButton, Popover, Slider, Switch, Typography } from "@mui/material";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import { useTheme } from "@mui/material/styles";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useCallback, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectRuntimeState } from "../../runtime-state/runtimeStateSelector";
import { selectResourceById } from "../resourceSelector";
import { useSendResourceCommand } from "../hooks/useSendResourceCommand";
import { useAnalogSlider } from "../hooks/useAnalogSlider";
import { isResourceActive } from "../isResourceActive";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";
import { getResourceIcon } from "./icons";
import { getResourceIconColor } from "./colors";
import { TilePopoverContext } from "./tile-extensions";

type ComplexPanelProps = {
    ctx: TilePopoverContext;
};

export const ComplexPanel: React.FC<ComplexPanelProps> = ({ ctx }) => {
    const { resource, anchorEl, onClose } = ctx;
    const portalContainer = usePortalContainerRef();
    const resourceById = useSelector(selectResourceById);
    const runtimeState = useSelector(selectRuntimeState);
    const subResources = resource.subResources;

    if (!subResources?.length) return null;

    return (
        <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={onClose}
            container={portalContainer.current}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
            slotProps={{
                paper: { sx: { minWidth: 280, maxWidth: 360, maxHeight: "70vh", overflow: "auto", p: 2 } },
            }}
        >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                {resource.name}
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {subResources.map((subRef, i) => {
                    const subResource = resourceById[subRef.resourceId] as TileRuntimeResource | undefined;
                    const subState = runtimeState.byResourceId[subRef.resourceId] as TileRuntimeResourceState | undefined;
                    if (!subResource) return null;

                    const showGroupHeader = subRef.group && subRef.group !== subResources[i - 1]?.group;

                    return (
                        <React.Fragment key={subRef.resourceId}>
                            {showGroupHeader && (
                                <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 700, color: "text.secondary", mt: i > 0 ? 0.5 : 0 }}
                                >
                                    {subRef.group}
                                </Typography>
                            )}
                            <SubResourceRow
                                resource={subResource}
                                state={subState}
                                label={subRef.label}
                            />
                        </React.Fragment>
                    );
                })}
            </Box>
        </Popover>
    );
};

/* ------------------------------------------------------------------ */
/* Sub-resource row: renders native control per type                    */
/* ------------------------------------------------------------------ */

const SubResourceRow: React.FC<{
    resource: TileRuntimeResource;
    state: TileRuntimeResourceState | undefined;
    label?: string;
}> = ({ resource, state, label }) => {
    const theme = useTheme();
    const iconColor = getResourceIconColor(theme, resource, state);
    const MainIcon = getResourceIcon(resource, state);

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 36 }}>
            <MainIcon sx={{ color: iconColor, fontSize: 18, flexShrink: 0 }} />
            <Typography
                variant="body2"
                sx={{ fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
                {label ?? resource.name}
            </Typography>
            <SubResourceControl resource={resource} state={state} iconColor={iconColor} />
        </Box>
    );
};

/* ------------------------------------------------------------------ */
/* Type-specific controls                                              */
/* ------------------------------------------------------------------ */

const SubResourceControl: React.FC<{
    resource: TileRuntimeResource;
    state: TileRuntimeResourceState | undefined;
    iconColor: string;
}> = ({ resource, state, iconColor }) => {
    if (resource.type === "digitalOutput") {
        return <DigitalOutputControl resource={resource} state={state} />;
    }
    if (resource.type === "digitalInput") {
        if (resource.inputType === "push") {
            return <DigitalInputPushControl resource={resource} state={state} iconColor={iconColor} />;
        }
        return <DigitalInputToggleControl resource={resource} state={state} />;
    }
    if (resource.type === "analogOutput") {
        return <AnalogOutputControl resource={resource} state={state} iconColor={iconColor} />;
    }
    // Read-only for analog inputs and timers
    return <ReadOnlyValue resource={resource} state={state} iconColor={iconColor} />;
};

const DigitalOutputControl: React.FC<{
    resource: TileRuntimeResource;
    state: TileRuntimeResourceState | undefined;
}> = ({ resource, state }) => {
    const sendCommand = useSendResourceCommand(resource.id);
    const checked = isResourceActive(resource, state);

    const handleToggle = useCallback(() => {
        sendCommand({ type: "toggle" });
    }, [sendCommand]);

    return (
        <Switch
            size="small"
            checked={checked}
            onChange={handleToggle}
        />
    );
};

const DigitalInputToggleControl: React.FC<{
    resource: TileRuntimeResource;
    state: TileRuntimeResourceState | undefined;
}> = ({ resource, state }) => {
    const sendCommand = useSendResourceCommand(resource.id);
    const checked = isResourceActive(resource, state);

    const handleToggle = useCallback(() => {
        sendCommand({ type: "toggle" });
    }, [sendCommand]);

    return (
        <Switch
            size="small"
            checked={checked}
            onChange={handleToggle}
        />
    );
};

const MIN_PRESS_DURATION_MS = 300;

const DigitalInputPushControl: React.FC<{
    resource: TileRuntimeResource;
    state: TileRuntimeResourceState | undefined;
    iconColor: string;
}> = ({ resource, state, iconColor }) => {
    const sendCommand = useSendResourceCommand(resource.id);
    const pressCommittedAtRef = useRef<number | null>(null);
    const active = isResourceActive(resource, state);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pressCommittedAtRef.current = Date.now();
        sendCommand({ type: "press" });
    }, [sendCommand]);

    const handlePointerUp = useCallback(() => {
        if (pressCommittedAtRef.current === null) return;
        const elapsed = Date.now() - pressCommittedAtRef.current;
        const remaining = MIN_PRESS_DURATION_MS - elapsed;
        pressCommittedAtRef.current = null;

        const release = () => sendCommand({ type: "release" });
        if (remaining > 0) {
            window.setTimeout(release, remaining);
        } else {
            release();
        }
    }, [sendCommand]);

    return (
        <IconButton
            size="small"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            sx={{
                color: active ? iconColor : "action.disabled",
                border: 1,
                borderColor: active ? iconColor : "divider",
                p: 0.5,
            }}
        >
            <RadioButtonCheckedIcon sx={{ fontSize: 16 }} />
        </IconButton>
    );
};

const AnalogOutputControl: React.FC<{
    resource: TileRuntimeResource;
    state: TileRuntimeResourceState | undefined;
    iconColor: string;
}> = ({ resource, state, iconColor }) => {
    const sendCommand = useSendResourceCommand(resource.id);
    const { localValue, handleChange, handleChangeCommitted, sendExact } =
        useAnalogSlider({ min: resource.min, max: resource.max }, state, sendCommand);

    const min = resource.min ?? 0;
    const max = resource.max ?? 65535;
    const step = resource.step ?? 1;
    const unit = resource.unit ?? "";

    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleValueClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setEditValue(String(localValue));
        setIsEditing(true);
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
            setIsEditing(false);
        }
    }, [commitEdit]);

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: "0 0 140px" }}>
            <Slider
                value={localValue}
                min={min}
                max={max}
                step={step}
                size="small"
                onChange={handleChange}
                onChangeCommitted={handleChangeCommitted}
                sx={{
                    flex: 1,
                    color: iconColor,
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
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        color: iconColor,
                        background: "transparent",
                        border: "none",
                        borderBottom: `1.5px solid ${iconColor}`,
                        outline: "none",
                        width: 36,
                        textAlign: "right",
                        padding: "0 2px",
                    }}
                />
            ) : (
                <Typography
                    variant="caption"
                    onClick={handleValueClick}
                    sx={{
                        fontFamily: "monospace",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        color: iconColor,
                        minWidth: 36,
                        textAlign: "right",
                        cursor: "pointer",
                        userSelect: "none",
                        borderRadius: 1,
                        px: 0.25,
                        "&:hover": {
                            backgroundColor: "action.hover",
                        },
                    }}
                >
                    {localValue}{unit ? ` ${unit}` : ""}
                </Typography>
            )}
        </Box>
    );
};

const ReadOnlyValue: React.FC<{
    resource: TileRuntimeResource;
    state: TileRuntimeResourceState | undefined;
    iconColor: string;
}> = ({ resource, state, iconColor }) => {
    if (state?.value === undefined) return null;
    const unit = resource.unit ?? "";
    return (
        <Typography
            variant="caption"
            sx={{
                fontFamily: "monospace",
                fontSize: "0.7rem",
                fontWeight: 600,
                color: iconColor,
            }}
        >
            {state.value}{unit ? ` ${unit}` : ""}
        </Typography>
    );
};
