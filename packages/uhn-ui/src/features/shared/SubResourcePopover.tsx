import { Box, Button, CardActionArea, Popover, Slider, Typography, useMediaQuery } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectRuntimeState } from "../runtime-state/runtimeStateSelector";
import { selectResourceById } from "../resource/resourceSelector";
import { useSendResourceCommand } from "../resource/hooks/useSendResourceCommand";
import { useAnalogSlider } from "../resource/hooks/useAnalogSlider";
import { useAnalogEditableInput } from "./useAnalogEditableInput";
import { isResourceActive } from "../resource/isResourceActive";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource/resource-ui.type";
import { AnalogSelectControl } from "./AnalogSelectControl";
import { getResourceIcon } from "../resource/components/icons";
import { getResourceIconColor } from "../resource/components/colors";

/** Minimal shape needed by the popover — satisfied by both
 *  RuntimeComplexSubResourceRef and RuntimeViewControl. */
type PopoverItem = {
    resourceId: string;
    label?: string;
    group?: string;
};

type GroupedItems = { name: string; items: PopoverItem[] }[];

function groupItems(items: PopoverItem[]): GroupedItems {
    const groups: GroupedItems = [];
    let currentGroup = "";
    for (const item of items) {
        if (item.group) currentGroup = item.group;
        const groupName = currentGroup || "";
        const last = groups[groups.length - 1];
        if (last && last.name === groupName) {
            last.items.push(item);
        } else {
            groups.push({ name: groupName, items: [item] });
        }
    }
    return groups;
}

type SubResourcePopoverProps = {
    items: PopoverItem[];
    title: string;
    anchorEl: HTMLElement | null;
    onClose: () => void;
    /** Inline action rendered right-aligned in the title row (e.g. toggle, tap button) */
    titleAction?: React.ReactNode;
    /** Full-width content rendered below the title row (e.g. analog slider) */
    headerContent?: React.ReactNode;
    /** Disable all interactive controls (e.g. when the parent view is inactive) */
    disabled?: boolean;
};

export const SubResourcePopover: React.FC<SubResourcePopoverProps> = ({
    items, title, anchorEl, onClose, titleAction, headerContent, disabled,
}) => {
    const portalContainer = usePortalContainerRef();
    const resourceById = useSelector(selectResourceById);
    const runtimeState = useSelector(selectRuntimeState);
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("sm"));
    const groups = useMemo(() => groupItems(items), [items]);
    const useHorizontal = isDesktop && groups.length > 1;

    if (!items.length) return null;

    return (
        <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={onClose}
            container={portalContainer.current}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
            slotProps={{
                paper: {
                    sx: {
                        minWidth: useHorizontal ? 400 : 280,
                        maxWidth: useHorizontal ? `min(90vw, ${groups.length * 320}px)` : 360,
                        maxHeight: "70vh",
                        overflow: "auto",
                        p: 2,
                    },
                },
            }}
        >
            <Box sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: (headerContent ? 0.5 : 1.5),
            }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
                    {title}
                </Typography>
                {titleAction}
            </Box>

            {headerContent && (
                <Box sx={{ mb: 1.5, pb: 1, borderBottom: 1, borderColor: "divider" }}>
                    {headerContent}
                </Box>
            )}

            {useHorizontal ? (
                <Box sx={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${groups.length}, minmax(250px, 1fr))`,
                    gap: 1.5,
                }}>
                    {groups.map(group => (
                        <Box key={group.name} sx={{ display: "flex", flexDirection: "column", gap: 1, bgcolor: "action.hover", borderRadius: 1.5, p: 1, boxShadow: 1 }}>
                            {group.name && (
                                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                                    {group.name}
                                </Typography>
                            )}
                            {group.items.map(subRef => {
                                const subResource = resourceById[subRef.resourceId] as TileRuntimeResource | undefined;
                                const subState = runtimeState.byResourceId[subRef.resourceId] as TileRuntimeResourceState | undefined;
                                if (!subResource) return null;
                                return (
                                    <SubResourceRow
                                        key={subRef.resourceId}
                                        resource={subResource}
                                        state={subState}
                                        label={subRef.label}
                                        disabled={disabled}
                                    />
                                );
                            })}
                        </Box>
                    ))}
                </Box>
            ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {items.map((subRef, i) => {
                        const subResource = resourceById[subRef.resourceId] as TileRuntimeResource | undefined;
                        const subState = runtimeState.byResourceId[subRef.resourceId] as TileRuntimeResourceState | undefined;
                        if (!subResource) return null;

                        const showGroupHeader = subRef.group && subRef.group !== items[i - 1]?.group;

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
                                    disabled={disabled}
                                />
                            </React.Fragment>
                        );
                    })}
                </Box>
            )}
        </Popover>
    );
};

/* ------------------------------------------------------------------ */
/* Sub-resource row: renders native control per type                    */
/* ------------------------------------------------------------------ */

const MIN_PRESS_DURATION_MS = 300;

const SubResourceRow: React.FC<{
    resource: TileRuntimeResource;
    state: TileRuntimeResourceState | undefined;
    label?: string;
    disabled?: boolean;
}> = ({ resource, state, label, disabled }) => {
    const theme = useTheme();
    const forceActive = resource.type === "actionOutput"; // actionOutput has no state — always show active
    const effectiveState = forceActive ? { value: true as const, timestamp: 0 } : state;
    const iconColor = getResourceIconColor(theme, resource, effectiveState);
    const MainIcon = getResourceIcon(resource, effectiveState);
    const active = forceActive || isResourceActive(resource, state);
    const sendCommand = useSendResourceCommand(resource.id);
    const pressCommittedAtRef = useRef<number | null>(null);

    const { type } = resource;
    const isDigital = type === "digitalOutput" || type === "digitalInput" || type === "virtualDigitalInput";
    const isPush = isDigital && resource.inputType === "push";
    const isAnalog = type === "analogOutput" || type === "virtualAnalogOutput";
    const isActionOutput = type === "actionOutput";

    const handleTileClick = useCallback(() => {
        if (disabled || !isDigital || isPush) return;
        sendCommand({ type: "toggle" });
    }, [sendCommand, disabled, isDigital, isPush]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (!isPush || disabled) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pressCommittedAtRef.current = Date.now();
        sendCommand({ type: "press" });
    }, [sendCommand, isPush, disabled]);

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

    const tileContent = (
        <>
            <MainIcon sx={{ color: iconColor, fontSize: 22 }} />
            <Typography variant="caption" sx={{
                fontWeight: 500, textAlign: "center",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                width: "100%",
            }}>
                {label ?? resource.name}
            </Typography>
            {isAnalog && (
                <Box sx={{ width: "100%" }}>
                    <AnalogOutputControl resource={resource} state={state} iconColor={iconColor} disabled={disabled} />
                </Box>
            )}
            {isActionOutput && resource.actions && (
                <Box sx={{ width: "100%" }}>
                    <ActionOutputControl actions={resource.actions} sendCommand={sendCommand} iconColor={iconColor} disabled={disabled} />
                </Box>
            )}
            {!isDigital && !isAnalog && !isActionOutput && state?.value !== undefined && (
                <ReadOnlyValue resource={resource} state={state} iconColor={iconColor} />
            )}
        </>
    );

    const tileSx = {
        display: "flex", flexDirection: "column", alignItems: "center",
        border: 1,
        borderColor: isDigital && active ? "transparent" : "divider",
        borderRadius: 1.5,
        p: 1, gap: 0,
        bgcolor: isDigital && active ? alpha(iconColor, 0.08) : undefined,
        transition: "border-color 0.2s, background-color 0.2s",
    } as const;

    if (isDigital) {
        return (
            <CardActionArea
                onClick={!isPush ? handleTileClick : undefined}
                onPointerDown={isPush ? handlePointerDown : undefined}
                onPointerUp={isPush ? handlePointerUp : undefined}
                onPointerCancel={isPush ? handlePointerUp : undefined}
                disabled={disabled}
                sx={{
                    ...tileSx,
                    userSelect: "none",
                    "&:active": { transform: "scale(0.97)" },
                }}
            >
                {tileContent}
            </CardActionArea>
        );
    }

    return <Box sx={tileSx}>{tileContent}</Box>;
};

const AnalogOutputControl: React.FC<{
    resource: TileRuntimeResource;
    state: TileRuntimeResourceState | undefined;
    iconColor: string;
    disabled?: boolean;
}> = ({ resource, state, iconColor, disabled }) => {
    const sendCommand = useSendResourceCommand(resource.id);
    const { localValue, handleChange, handleChangeCommitted, sendExact } =
        useAnalogSlider({ min: resource.min, max: resource.max }, state, sendCommand);

    const hasOptions = resource.options && resource.options.length > 0;

    if (hasOptions) {
        return (
            <AnalogSelectControl
                options={resource.options!}
                value={localValue}
                onChange={sendExact}
                iconColor={iconColor}
                disabled={disabled}
            />
        );
    }

    const min = resource.min ?? 0;
    const max = resource.max ?? 65535;
    const step = resource.step ?? 1;
    const unit = resource.unit ?? "";

    const { isEditing, inputRef, handleFocus, commitEdit, handleKeyDown } =
        useAnalogEditableInput(localValue, unit, sendExact, { stopEscapePropagation: true });

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Slider
                value={localValue}
                min={min}
                max={max}
                step={step}
                size="small"
                disabled={disabled}
                onChange={handleChange}
                onChangeCommitted={handleChangeCommitted}
                sx={{
                    flex: 1,
                    color: iconColor,
                }}
            />
            <input
                ref={inputRef}
                defaultValue={`${localValue}${unit ? ` ${unit}` : ""}`}
                onFocus={handleFocus}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                onPointerDown={(e) => e.stopPropagation()}
                inputMode="decimal"
                readOnly={!isEditing}
                disabled={disabled}
                style={{
                    fontFamily: "monospace",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: iconColor,
                    background: "transparent",
                    border: "none",
                    borderBottom: isEditing ? `1.5px solid ${iconColor}` : "1.5px solid transparent",
                    outline: "none",
                    width: 36,
                    textAlign: "right",
                    padding: "0 2px",
                    cursor: isEditing ? "text" : "pointer",
                    borderRadius: 4,
                }}
            />
        </Box>
    );
};

const ActionOutputControl: React.FC<{
    actions: string[];
    sendCommand: (command: { type: "setActionOutput"; action: string }) => Promise<void>;
    iconColor: string;
    disabled?: boolean;
}> = ({ actions, sendCommand, iconColor, disabled }) => {
    const [pending, setPending] = useState<string | null>(null);

    const handleClick = useCallback(async (action: string) => {
        setPending(action);
        try {
            await sendCommand({ type: "setActionOutput", action });
        } finally {
            setPending(null);
        }
    }, [sendCommand]);

    return (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, justifyContent: "center" }}>
            {actions.map(action => (
                <Button
                    key={action}
                    size="small"
                    variant="outlined"
                    disabled={disabled || pending === action}
                    onClick={() => handleClick(action)}
                    sx={{
                        fontSize: "0.65rem",
                        textTransform: "none",
                        minWidth: 0,
                        px: 1,
                        py: 0.25,
                        borderColor: iconColor,
                        color: iconColor,
                        "&:hover": { borderColor: iconColor, bgcolor: `${iconColor}14` },
                        "&:active": { transform: "scale(0.93)", bgcolor: `${iconColor}22` },
                    }}
                >
                    {action.replace(/_/g, " ")}
                </Button>
            ))}
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
