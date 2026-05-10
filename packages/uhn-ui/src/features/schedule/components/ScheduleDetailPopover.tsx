import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CloseIcon from "@mui/icons-material/Close";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import { Box, Button, Divider, IconButton, Popover, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { Show, usePortalContainerRef } from "@uxp/ui-lib";
import { ScheduleWhen } from "@uhn/blueprint";
import { ScheduleMuteInfo } from "@uhn/common";
import { DateTime } from "luxon";
import React, { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { formatDateTime } from "../../shared/dateTimeFormat";
import { useMuteScheduleMutation, useUnmuteScheduleMutation, useDeleteScheduleMutation } from "../schedule.api";
import { describeWhen } from "../schedule.util";
import { selectMuteByScheduleId } from "../scheduleSelectors";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type PhaseInfo = {
    name: string;
    when: ScheduleWhen;
};

export type SlotActionInfo = {
    label: string;
    link?: string; // deep link path, e.g. /technical/resources/xxx
};

type SlotInfo = {
    name: string;
    when: ScheduleWhen;
    actions?: SlotActionInfo[];
};

export type ScheduleDetailData = {
    id: string;
    name: string;
    description?: string;
    source: "blueprint" | "user";
    phases: PhaseInfo[];
    slots?: SlotInfo[];
    missedGraceMs?: number;
    mute?: ScheduleMuteInfo;
    dbId?: number;
    createdBy?: string;
    createdAt?: string;
};

type ScheduleDetailPopoverProps = {
    data: ScheduleDetailData;
    anchorPosition: { top: number; left: number } | null;
    onClose: () => void;
    onEdit?: () => void;
};

/* ------------------------------------------------------------------ */
/* Section header                                                      */
/* ------------------------------------------------------------------ */

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, mt: 1.5, mb: 0.5, display: "block" }}>
        {children}
    </Typography>
);

/* ------------------------------------------------------------------ */
/* Popover                                                             */
/* ------------------------------------------------------------------ */

export const ScheduleDetailPopover: React.FC<ScheduleDetailPopoverProps> = ({ data, anchorPosition, onClose, onEdit }) => {
    const portalContainer = usePortalContainerRef();
    const theme = useTheme();
    const muteById = useSelector(selectMuteByScheduleId);
    const mute = muteById[data.id];
    const isMuted = !!mute;
    const [muteUntilValue, setMuteUntilValue] = useState<DateTime | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [muteSchedule] = useMuteScheduleMutation();
    const [unmuteSchedule] = useUnmuteScheduleMutation();
    const [deleteSchedule] = useDeleteScheduleMutation();

    const handleMute = useCallback(async (durationMs: number | null) => {
        setError(null);
        try {
            await muteSchedule({ scheduleId: data.id, durationMs }).unwrap();
        } catch {
            setError("Failed to mute schedule");
        }
    }, [data.id, muteSchedule]);

    const handleMuteUntil = useCallback(async (until: DateTime) => {
        const durationMs = until.diff(DateTime.now()).as("milliseconds");
        if (durationMs <= 0) return;
        setError(null);
        try {
            await muteSchedule({ scheduleId: data.id, durationMs }).unwrap();
            setMuteUntilValue(null);
        } catch {
            setError("Failed to mute schedule");
        }
    }, [data.id, muteSchedule]);

    const handleUnmute = useCallback(async () => {
        setError(null);
        try {
            await unmuteSchedule({ scheduleId: data.id }).unwrap();
        } catch {
            setError("Failed to unmute schedule");
        }
    }, [data.id, unmuteSchedule]);

    const handleDelete = useCallback(async () => {
        if (!data.dbId) return;
        setError(null);
        try {
            await deleteSchedule(data.dbId).unwrap();
            onClose();
        } catch {
            setError("Failed to delete schedule");
        }
    }, [data.dbId, onClose, deleteSchedule]);

    const graceLabel = data.missedGraceMs != null
        ? data.missedGraceMs === 0 ? "Skip if missed" : `${Math.round(data.missedGraceMs / 60_000)} min`
        : undefined;

    return (
        <Popover
            open={Boolean(anchorPosition)}
            anchorReference="anchorPosition"
            anchorPosition={anchorPosition ?? undefined}
            onClose={onClose}
            container={portalContainer.current}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
            slotProps={{ paper: { sx: { width: 320, maxHeight: 480, p: 2 } } }}
        >
            {/* Header */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{data.name}</Typography>
                    <Show when={data.description}>
                        <Typography variant="body2" color="text.secondary">{data.description}</Typography>
                    </Show>
                </Box>
                <IconButton size="small" onClick={onClose} sx={{ ml: 1, flexShrink: 0 }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            <Divider sx={{ my: 1 }} />

            {/* Phases (blueprint) */}
            <Show when={data.source === "blueprint"}>
                <SectionHeader>Phases</SectionHeader>
                {data.phases.map((phase, i) => (
                    <Box key={i} sx={{ mb: 0.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <CalendarMonthIcon sx={{ fontSize: 14, color: "primary.main" }} />
                            <Typography variant="body2" fontWeight={600}>{phase.name}</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ pl: 2.5 }}>
                            {describeWhen(phase.when)}
                        </Typography>
                    </Box>
                ))}
            </Show>

            {/* Slots (user) */}
            <Show when={data.source === "user" && !!data.slots}>
                <SectionHeader>Slots</SectionHeader>
                {data.slots?.map((slot, i) => (
                    <Box key={i} sx={{ mb: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{slot.name}</Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, pl: 1 }}>
                            <CalendarMonthIcon sx={{ fontSize: 12, color: "primary.main" }} />
                            <Typography variant="caption">
                                {describeWhen(slot.when)}
                            </Typography>
                        </Box>
                        {slot.actions?.map((action, j) => (
                            <Typography key={j} variant="caption" sx={{ pl: 1, fontSize: "0.8rem", display: "block" }}>
                                → {action.link ? (
                                    <Typography
                                        component={Link}
                                        to={action.link}
                                        variant="caption"
                                        onClick={onClose}
                                        sx={{ fontSize: "inherit", color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                                    >
                                        {action.label}
                                    </Typography>
                                ) : action.label}
                            </Typography>
                        ))}
                    </Box>
                ))}
            </Show>

            {/* Details */}
            <SectionHeader>Details</SectionHeader>
            <Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 8px", fontSize: "0.8rem" }}>
                <Typography variant="caption" color="text.secondary">Source</Typography>
                <Typography variant="caption">{data.source === "blueprint" ? "Blueprint" : "Custom"}</Typography>
                <Show when={graceLabel}>
                    <Typography variant="caption" color="text.secondary">Missed grace</Typography>
                    <Typography variant="caption">{graceLabel}</Typography>
                </Show>
                <Typography variant="caption" color="text.secondary">ID</Typography>
                <Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: "0.7rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {data.id}
                </Typography>
                <Show when={data.createdBy}>
                    <Typography variant="caption" color="text.secondary">Created by</Typography>
                    <Typography variant="caption">{data.createdBy}</Typography>
                </Show>
                <Show when={data.createdAt}>
                    <Typography variant="caption" color="text.secondary">Created</Typography>
                    <Typography variant="caption">{formatDateTime(data.createdAt!)}</Typography>
                </Show>
            </Box>

            {/* Mute section */}
            <SectionHeader>Mute</SectionHeader>
            <Box sx={{ minHeight: 80 }}>
            <LocalizationProvider dateAdapter={AdapterLuxon} adapterLocale="fi">
                <Show when={isMuted}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                        <VolumeOffIcon sx={{ fontSize: 14, color: "warning.main" }} />
                        <Typography variant="body2">
                            By {mute?.mutedBy}
                            {mute?.mutedUntil ? ` · Until ${formatDateTime(mute.mutedUntil)}` : " · Indefinitely"}
                        </Typography>
                    </Box>
                    <Button size="small" variant="outlined" onClick={handleUnmute}>
                        Unmute
                    </Button>
                </Show>
                <Show when={!isMuted}>
                    <Box sx={{ display: "flex", gap: 0.5, mb: 1 }}>
                        <Button size="small" variant="outlined" sx={{ flex: 1 }} onClick={() => handleMute(3_600_000)}>1h</Button>
                        <Button size="small" variant="outlined" sx={{ flex: 1 }} onClick={() => handleMute(86_400_000)}>24h</Button>
                        <Button size="small" variant="outlined" sx={{ flex: 1 }} onClick={() => handleMute(604_800_000)}>1w</Button>
                        <Button size="small" variant="outlined" sx={{ flex: 1 }} onClick={() => handleMute(null)}>∞</Button>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                        <DateTimePicker
                            label="Mute until"
                            value={muteUntilValue}
                            onChange={setMuteUntilValue}
                            ampm={false}
                            disablePast
                            format="d.M.yyyy HH:mm"
                            slotProps={{
                                textField: { size: "small", sx: { flex: 1 } },
                                openPickerIcon: { sx: { color: theme.palette.primary.main } },
                                popper: { container: portalContainer.current, sx: { zIndex: 1500 } },
                                dialog: { container: portalContainer.current },
                                mobilePaper: { sx: { zIndex: 1500 } },
                                toolbar: { toolbarFormat: "d.M.yyyy", toolbarPlaceholder: "", sx: { "& .MuiDateTimePickerToolbar-dateContainer > button:first-of-type": { display: "none" } } },
                            }}
                        />
                        <Button
                            size="small"
                            variant="contained"
                            disabled={!muteUntilValue}
                            onClick={() => muteUntilValue && handleMuteUntil(muteUntilValue)}
                        >
                            Mute
                        </Button>
                    </Box>
                </Show>
            </LocalizationProvider>
            </Box>

            <Show when={error}>
                <Typography variant="caption" color="error" sx={{ mt: 1, display: "block" }}>
                    {error}
                </Typography>
            </Show>

            {/* User schedule actions */}
            <Show when={data.source === "user"}>
                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 2 }}>
                    <Show when={onEdit}>
                        <Button size="small" onClick={onEdit}>Edit</Button>
                    </Show>
                    <Show when={deleteConfirm}>
                        <Button size="small" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                        <Button size="small" color="error" variant="contained" onClick={handleDelete}>Confirm Delete</Button>
                    </Show>
                    <Show when={!deleteConfirm}>
                        <Button size="small" color="error" onClick={() => setDeleteConfirm(true)}>Delete</Button>
                    </Show>
                </Box>
            </Show>
        </Popover>
    );
};
