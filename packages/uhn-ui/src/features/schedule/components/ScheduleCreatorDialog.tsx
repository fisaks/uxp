import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import {
    Autocomplete,
    Box,
    Button,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    TextField,
    Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { RuntimeInteractionView, RuntimeResource, RuntimeScene, StoredScheduleAction, UhnScheduleCreatePayload, UserScheduleSlot } from "@uhn/common";
import { ScheduleWhen, SunEvent } from "@uhn/blueprint";
import { isAnalogOutput, isDigitalInput, isVirtualAnalogOutput } from "../schedule.util";
import { DateTime } from "luxon";
import React, { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { selectAllViews } from "../../view/viewSelectors";
import { selectAllResources } from "../../resource/resourceSelector";
import { selectAllScenes } from "../../scene/sceneSelectors";
import { useCreateScheduleMutation, useUpdateScheduleMutation } from "../schedule.api";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type DaySelection = "daily" | "weekdays" | "weekends" | "custom";
type TimeMode = "clock" | "sun" | "monthly" | "yearly" | "date";

type WhenFormState = {
    daySelection: DaySelection;
    customDays: boolean[];
    timeMode: TimeMode;
    clockTime: string;
    sunEvent: SunEvent;
    sunOffset: number;
    monthlyDay: number;
    monthlyTime: string;
    yearlyMonth: number;
    yearlyDay: number;
    yearlyTime: string;
    dateYear: number;
    dateMonth: number;
    dateDay: number;
    dateTime: string;
};

type ScheduleTarget = {
    kind: "view";
    id: string;
    label: string;
    item: RuntimeInteractionView;
} | {
    kind: "resource";
    id: string;
    label: string;
    item: RuntimeResource;
} | {
    kind: "scene";
    id: string;
    label: string;
    item: RuntimeScene;
};

type ActionType = "on" | "off" | "tap" | "longPress" | "setValue" | "activate";

type ActionFormEntry = {
    target: ScheduleTarget | null;
    actionType: ActionType;
    value?: number;
    primary?: boolean;
};

type SlotFormState = {
    name: string;
    when: WhenFormState;
    actions: ActionFormEntry[];
};

const SUN_EVENT_OPTIONS: { value: SunEvent; label: string }[] = [
    { value: "dawn", label: "When it gets light" },
    { value: "sunrise", label: "Sunrise" },
    { value: "goldenHourEnd", label: "Golden hour end" },
    { value: "solarNoon", label: "Solar noon" },
    { value: "goldenHour", label: "Golden hour start" },
    { value: "sunset", label: "Sunset" },
    { value: "dusk", label: "When it gets dark" },
    { value: "night", label: "Fully dark" },
];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function whenToFormState(when: ScheduleWhen): WhenFormState {
    const base = defaultWhen();
    if (when.kind === "cron") {
        const parts = when.expression.split(" ");
        if (parts.length === 5) {
            const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
            const time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;

            // Yearly: specific day + specific month + any dayOfWeek
            if (dayOfMonth !== "*" && month !== "*" && dayOfWeek === "*") {
                base.timeMode = "yearly";
                base.yearlyDay = parseInt(dayOfMonth) || 1;
                base.yearlyMonth = parseInt(month) || 1;
                base.yearlyTime = time;
                return base;
            }
            // Monthly: specific day + any month + any dayOfWeek
            if (dayOfMonth !== "*" && month === "*" && dayOfWeek === "*") {
                base.timeMode = "monthly";
                base.monthlyDay = parseInt(dayOfMonth) || 1;
                base.monthlyTime = time;
                return base;
            }
            // Weekly: any day-of-month + any month + specific dayOfWeek
            base.timeMode = "clock";
            base.clockTime = time;
            if (dayOfWeek === "*") {
                base.customDays = [true, true, true, true, true, true, true];
                base.daySelection = "daily";
            } else if (dayOfWeek === "1-5") {
                base.customDays = [true, true, true, true, true, false, false];
                base.daySelection = "weekdays";
            } else if (dayOfWeek === "0,6") {
                base.customDays = [false, false, false, false, false, true, true];
                base.daySelection = "weekends";
            } else {
                const days = dayOfWeek.split(",").map(Number);
                base.customDays = [1, 2, 3, 4, 5, 6, 0].map(d => days.includes(d));
                base.daySelection = "custom";
            }
        }
    } else if (when.kind === "sun") {
        base.timeMode = "sun";
        base.sunEvent = when.event;
        base.sunOffset = when.offsetMinutes ?? 0;
    } else if (when.kind === "date") {
        base.timeMode = "date";
        base.dateYear = when.year ?? new Date().getFullYear();
        base.dateMonth = when.month;
        base.dateDay = when.day;
        base.dateTime = when.time;
    }
    return base;
}

function defaultWhen(): WhenFormState {
    return {
        daySelection: "daily",
        customDays: [true, true, true, true, true, false, false],
        timeMode: "clock",
        clockTime: "07:00",
        sunEvent: "dusk",
        sunOffset: 0,
        monthlyDay: 1,
        monthlyTime: "08:00",
        yearlyMonth: new Date().getMonth() + 1,
        yearlyDay: new Date().getDate(),
        yearlyTime: "08:00",
        dateYear: new Date().getFullYear(),
        dateMonth: new Date().getMonth() + 1,
        dateDay: new Date().getDate(),
        dateTime: "08:00",
    };
}

function defaultSlotName(actions: ActionFormEntry[]): string {
    if (actions.length === 0) return "";
    const first = actions[0];
    if (!first.target) return "";
    switch (first.actionType) {
        case "on": return "Turn on";
        case "off": return "Turn off";
        case "tap": return "Press";
        case "longPress": return "Long press";
        case "setValue": return `Set to ${first.value ?? 0}`;
        case "activate": return "Activate";
    }
}

function defaultScheduleName(actions: ActionFormEntry[]): string {
    if (actions.length === 0) return "";
    const first = actions[0];
    if (!first.target) return "";
    return `Schedule for ${first.target.label}`;
}

function parseTime(time: string): DateTime {
    const [h, m] = time.split(":").map(Number);
    return DateTime.now().set({ hour: h || 0, minute: m || 0, second: 0, millisecond: 0 });
}

function buildCronExpression(when: WhenFormState): string {
    const [h, m] = when.clockTime.split(":").map(Number);
    const allSelected = when.customDays.every(Boolean);
    const dayOfWeek = allSelected ? "*" : when.customDays
        .map((on, i) => on ? (i + 1) % 7 : -1)
        .filter(d => d >= 0)
        .join(",") || "*";
    return `${m} ${h} * * ${dayOfWeek}`;
}

function buildWhen(when: WhenFormState): ScheduleWhen {
    if (when.timeMode === "sun") return { kind: "sun", event: when.sunEvent, offsetMinutes: when.sunOffset };
    if (when.timeMode === "monthly") {
        const [h, m] = when.monthlyTime.split(":").map(Number);
        return { kind: "cron", expression: `${m} ${h} ${when.monthlyDay} * *` };
    }
    if (when.timeMode === "yearly") {
        const [h, m] = when.yearlyTime.split(":").map(Number);
        return { kind: "cron", expression: `${m} ${h} ${when.yearlyDay} ${when.yearlyMonth} *` };
    }
    if (when.timeMode === "date") return { kind: "date", month: when.dateMonth, day: when.dateDay, time: when.dateTime, year: when.dateYear };
    return { kind: "cron", expression: buildCronExpression(when) };
}

function getActionTypes(target: ScheduleTarget | null): { value: ActionType; label: string }[] {
    if (!target) return [{ value: "on", label: "Turn on" }];
    if (target.kind === "scene") return [{ value: "activate", label: "Activate" }];
    if (target.kind === "view") {
        const cmd = target.item.command;
        if (cmd?.type === "tap") return [{ value: "tap", label: "Press" }];
        if (cmd?.type === "longPress") return [{ value: "longPress", label: "Long press" }];
        if (cmd?.type === "toggle") return [{ value: "on", label: "Turn on" }, { value: "off", label: "Turn off" }];
        if (cmd?.type === "setAnalog") return [{ value: "on", label: "Turn on" }, { value: "off", label: "Turn off" }, { value: "setValue", label: "Set to" }];
        return [{ value: "on", label: "Turn on" }, { value: "off", label: "Turn off" }];
    }
    const r = target.item;
    if (isDigitalInput(r)) {
        return r.inputType === "push"
            ? [{ value: "tap", label: "Press" }]
            : [{ value: "on", label: "Turn on" }, { value: "off", label: "Turn off" }];
    }
    if (isAnalogOutput(r) || isVirtualAnalogOutput(r)) return [{ value: "on", label: "Turn on" }, { value: "off", label: "Turn off" }, { value: "setValue", label: "Set to" }];
    return [{ value: "on", label: "Turn on" }, { value: "off", label: "Turn off" }];
}

function resolveAction(entry: ActionFormEntry): StoredScheduleAction | undefined {
    const { target, actionType, value } = entry;
    if (!target) return undefined;
    if (target.kind === "scene") return { type: "activateScene", sceneId: target.id };
    if (target.kind === "view") {
        const cmd = target.item.command;
        if (!cmd) return undefined;
        const resourceId = cmd.resourceId;
        if (actionType === "tap") return { type: "tap", resourceId };
        if (actionType === "longPress") return { type: "longPress", resourceId, holdMs: cmd.holdMs ?? 500, simulateHold: cmd.simulateHold };
        if (cmd.type === "toggle") return actionType === "on" ? { type: "emitSignal", resourceId, value: true } : { type: "emitSignal", resourceId, value: false };
        if (cmd.type === "setAnalog") {
            if (actionType === "on") return { type: "setAnalogOutput", resourceId, value: cmd.defaultOnValue ?? cmd.max ?? 100 };
            if (actionType === "off") return { type: "setAnalogOutput", resourceId, value: 0 };
            if (actionType === "setValue") return { type: "setAnalogOutput", resourceId, value: value ?? 0 };
        }
        return actionType === "on" ? { type: "setDigitalOutput", resourceId, value: true } : { type: "setDigitalOutput", resourceId, value: false };
    }
    const resourceId = target.id;
    const r = target.item;
    if (actionType === "tap") return { type: "tap", resourceId };
    if (isDigitalInput(r) && r.inputType === "toggle") {
        return actionType === "on" ? { type: "emitSignal", resourceId, value: true } : { type: "emitSignal", resourceId, value: false };
    }
    if (isAnalogOutput(r)) {
        if (actionType === "on") return { type: "setAnalogOutput", resourceId, value: r.defaultOnValue ?? r.max ?? 100 };
        if (actionType === "off") return { type: "setAnalogOutput", resourceId, value: 0 };
        if (actionType === "setValue") return { type: "setAnalogOutput", resourceId, value: value ?? 0 };
    }
    if (isVirtualAnalogOutput(r)) {
        if (actionType === "on") return { type: "setAnalogOutput", resourceId, value: r.defaultOnValue ?? r.max ?? 100 };
        if (actionType === "off") return { type: "setAnalogOutput", resourceId, value: 0 };
        if (actionType === "setValue") return { type: "setAnalogOutput", resourceId, value: value ?? 0 };
    }
    return actionType === "on" ? { type: "setDigitalOutput", resourceId, value: true } : { type: "setDigitalOutput", resourceId, value: false };
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

type PrimaryTarget = {
    kind: "view"; viewId: string;
} | {
    kind: "resource"; resourceId: string;
} | {
    kind: "scene"; sceneId: string;
};

export type EditScheduleData = {
    dbId: number;
    name: string;
    missedGraceMs: number;
    slots: { name: string; when: ScheduleWhen; actions: { target: ScheduleTarget | null; actionType: ActionType; value?: number }[] }[];
};

type ScheduleCreatorDialogProps = {
    open: boolean;
    onClose: () => void;
    primaryTarget?: PrimaryTarget;
    editData?: EditScheduleData;
};

/* ------------------------------------------------------------------ */
/* Slot editor component                                               */
/* ------------------------------------------------------------------ */

const SlotEditor: React.FC<{
    slot: SlotFormState;
    index: number;
    canRemove: boolean;
    targets: ScheduleTarget[];
    menuTextColor: string;
    portalContainer: React.RefObject<HTMLDivElement>;
    onChange: (index: number, slot: SlotFormState) => void;
    onRemove: (index: number) => void;
    onSuggestScheduleName?: (name: string) => void;
}> = ({ slot, index, canRemove, targets, menuTextColor, portalContainer, onChange, onRemove, onSuggestScheduleName }) => {
    const theme = useTheme();

    const updateWhen = (update: Partial<WhenFormState>) => {
        onChange(index, { ...slot, when: { ...slot.when, ...update } });
    };

    const updateActions = (actions: ActionFormEntry[]) => {
        const prevDefault = defaultSlotName(slot.actions);
        const newDefault = defaultSlotName(actions);
        const newName = (!slot.name || slot.name === prevDefault) ? newDefault : slot.name;
        onChange(index, { ...slot, actions, name: newName });
        if (index === 0 && onSuggestScheduleName) {
            onSuggestScheduleName(defaultScheduleName(actions));
        }
    };

    return (
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1.5, mb: 1.5, position: "relative" }}>
            {/* Slot label on border */}
            <Typography variant="caption" sx={{
                position: "absolute",
                top: -9,
                left: 10,
                px: 0.5,
                backgroundColor: "transparent",
                color: "text.secondary",
                fontSize: "0.7rem",
            }}>
                Slot {index + 1}
            </Typography>

            {/* Slot header */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <TextField
                    size="small"
                    value={slot.name}
                    onChange={(e) => onChange(index, { ...slot, name: e.target.value })}
                    variant="standard"
                    placeholder="e.g. Turn on, Morning, Evening"
                    sx={{ flex: 1 }}
                    slotProps={{ htmlInput: { style: { fontWeight: 600, fontSize: "0.9rem" } } }}
                />
                {canRemove && (
                    <IconButton size="small" onClick={() => onRemove(index)} sx={{
                        position: "absolute",
                        top: -10,
                        right: -10,
                        p: 0.3,
                        backgroundColor: "background.paper",
                        "&:hover": { backgroundColor: "action.hover" },
                    }}>
                        <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                )}
            </Box>

            {/* When */}
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>When</Typography>
            <Box>
            <RadioGroup value={slot.when.timeMode} onChange={(e) => updateWhen({ timeMode: e.target.value as TimeMode })} row>
                <FormControlLabel value="clock" control={<Radio size="small" />} label="Weekly" />
                <FormControlLabel value="monthly" control={<Radio size="small" />} label="Monthly" />
                <FormControlLabel value="yearly" control={<Radio size="small" />} label="Yearly" />
                <FormControlLabel value="sun" control={<Radio size="small" />} label="Sun" />
                <FormControlLabel value="date" control={<Radio size="small" />} label="Once" />
            </RadioGroup>

            {/* Day selection — clock mode only */}
            <Collapse in={slot.when.timeMode === "clock"} timeout={200}>
                <>
                    <Box sx={{ display: "flex", gap: 0.5, mb: 0.5 }}>
                        <Button size="small" variant="outlined"
                            onClick={() => updateWhen({ customDays: [true, true, true, true, true, true, true], daySelection: "daily" })}
                            sx={{ flex: 1, fontSize: "0.7rem" }}
                        >Daily</Button>
                        <Button size="small" variant="outlined"
                            onClick={() => updateWhen({ customDays: [true, true, true, true, true, false, false], daySelection: "weekdays" })}
                            sx={{ flex: 1, fontSize: "0.7rem" }}
                        >Weekdays</Button>
                        <Button size="small" variant="outlined"
                            onClick={() => updateWhen({ customDays: [false, false, false, false, false, true, true], daySelection: "weekends" })}
                            sx={{ flex: 1, fontSize: "0.7rem" }}
                        >Weekends</Button>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.5, mb: 0.5 }}>
                        {DAY_NAMES.map((day, i) => (
                            <Button key={day} size="small"
                                color={slot.when.customDays[i] ? "primary" : "inherit"}
                                variant={slot.when.customDays[i] ? "contained" : "text"}
                                onClick={() => {
                                    const next = [...slot.when.customDays];
                                    next[i] = !next[i];
                                    updateWhen({ customDays: next, daySelection: "custom" });
                                }}
                                sx={{ minWidth: 0, px: 0.5, flex: 1, fontSize: "0.75rem", opacity: slot.when.customDays[i] ? 1 : 0.4 }}
                            >{day}</Button>
                        ))}
                    </Box>
                </>
            </Collapse>

            {/* Time/Sun/Date specific inputs */}
            <Collapse in={slot.when.timeMode === "clock"} timeout={200}>
                <TimePicker
                    label="Time" value={parseTime(slot.when.clockTime)}
                    onChange={(v) => v && updateWhen({ clockTime: v.toFormat("HH:mm") })}
                    ampm={false}
                    slotProps={{ textField: { size: "small", sx: { width: 150, mt: 1 } }, openPickerIcon: { sx: { color: theme.palette.primary.main } }, popper: { container: portalContainer.current } }}
                />
            </Collapse>
            <Collapse in={slot.when.timeMode === "monthly"} timeout={200}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5 }}>
                    <TextField label="Day of month" type="number" value={slot.when.monthlyDay}
                        onChange={(e) => updateWhen({ monthlyDay: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)) })}
                        size="small" slotProps={{ htmlInput: { min: 1, max: 31 } }} sx={{ width: 120 }}
                    />
                    <TimePicker
                        label="Time" value={parseTime(slot.when.monthlyTime)}
                        onChange={(v) => v && updateWhen({ monthlyTime: v.toFormat("HH:mm") })}
                        ampm={false}
                        slotProps={{ textField: { size: "small", sx: { width: 130 } }, openPickerIcon: { sx: { color: theme.palette.primary.main } }, popper: { container: portalContainer.current } }}
                    />
                </Box>
            </Collapse>
            <Collapse in={slot.when.timeMode === "yearly"} timeout={200}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5 }}>
                    <TextField label="Day" type="number" value={slot.when.yearlyDay}
                        onChange={(e) => updateWhen({ yearlyDay: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)) })}
                        size="small" slotProps={{ htmlInput: { min: 1, max: 31 } }} sx={{ width: 80 }}
                    />
                    <TextField label="Month" type="number" value={slot.when.yearlyMonth}
                        onChange={(e) => updateWhen({ yearlyMonth: Math.max(1, Math.min(12, parseInt(e.target.value) || 1)) })}
                        size="small" slotProps={{ htmlInput: { min: 1, max: 12 } }} sx={{ width: 80 }}
                    />
                    <TimePicker
                        label="Time" value={parseTime(slot.when.yearlyTime)}
                        onChange={(v) => v && updateWhen({ yearlyTime: v.toFormat("HH:mm") })}
                        ampm={false}
                        slotProps={{ textField: { size: "small", sx: { width: 130 } }, openPickerIcon: { sx: { color: theme.palette.primary.main } }, popper: { container: portalContainer.current } }}
                    />
                </Box>
            </Collapse>
            <Collapse in={slot.when.timeMode === "sun"} timeout={200}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5 }}>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Sun event</InputLabel>
                        <Select value={slot.when.sunEvent} label="Sun event"
                            onChange={(e) => updateWhen({ sunEvent: e.target.value as SunEvent })}
                            MenuProps={{ container: portalContainer.current }}
                        >
                            {SUN_EVENT_OPTIONS.map(o => <MenuItem key={o.value} value={o.value} sx={{ color: menuTextColor }}>{o.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField label="Offset (min)" type="number" value={slot.when.sunOffset}
                        onChange={(e) => updateWhen({ sunOffset: parseInt(e.target.value) || 0 })}
                        size="small" sx={{ width: 100 }}
                    />
                </Box>
            </Collapse>
            <Collapse in={slot.when.timeMode === "date"} timeout={200}>
                <Box sx={{ mt: 0.5 }}>
                <DateTimePicker
                    label="Date & Time"
                    value={DateTime.fromObject({ year: slot.when.dateYear, month: slot.when.dateMonth, day: slot.when.dateDay,
                        hour: parseInt(slot.when.dateTime.split(":")[0]) || 0, minute: parseInt(slot.when.dateTime.split(":")[1]) || 0 })}
                    onChange={(v) => v && updateWhen({ dateYear: v.year, dateMonth: v.month, dateDay: v.day, dateTime: v.toFormat("HH:mm") })}
                    ampm={false}
                    format="d.M.yyyy HH:mm"
                    slotProps={{
                        textField: { size: "small" },
                        openPickerIcon: { sx: { color: theme.palette.primary.main } },
                        popper: { container: portalContainer.current },
                        toolbar: { toolbarFormat: "d.M.yyyy", sx: { "& .MuiDateTimePickerToolbar-dateContainer > button:first-of-type": { display: "none" } } },
                    }}
                />
                </Box>
            </Collapse>
            </Box>

            {/* Actions */}
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mt: 1, display: "block" }}>Actions</Typography>
            {slot.actions.map((entry, i) => (
                <Box key={i} sx={{ display: "flex", gap: 0.5, mb: 0.5, alignItems: "center" }}>
                    <Autocomplete
                        size="small" sx={{ flex: 1 }}
                        options={targets}
                        groupBy={(t) => t.kind === "view" ? "Views" : t.kind === "resource" ? "Resources" : "Scenes"}
                        getOptionLabel={(t) => t.label}
                        filterOptions={(options, { inputValue }) => {
                            const words = inputValue.toLowerCase().split(/\s+/).filter(Boolean);
                            if (!words.length) return options;
                            return options.filter(t => {
                                const text = [t.label, t.id, ...(t.item.keywords ?? [])].join(" ").toLowerCase();
                                return words.every(w => text.includes(w));
                            });
                        }}
                        value={entry.target}
                        onChange={(_, t) => {
                            if (entry.primary) return;
                            const acts = [...slot.actions];
                            acts[i] = { ...entry, target: t, actionType: t?.kind === "scene" ? "activate" : "on" };
                            updateActions(acts);
                        }}
                        disabled={!!entry.primary}
                        renderInput={(params) => <TextField {...params} label="Target" />}
                        slotProps={{ popper: { container: portalContainer.current } }}
                        isOptionEqualToValue={(o, v) => o.kind === v.kind && o.id === v.id}
                    />
                    <FormControl size="small" sx={{ minWidth: 90 }}>
                        <Select value={entry.actionType}
                            onChange={(e) => {
                                if (entry.primary) return;
                                const acts = [...slot.actions];
                                acts[i] = { ...entry, actionType: e.target.value as ActionType };
                                updateActions(acts);
                            }}
                            disabled={!!entry.primary && entry.target?.kind === "scene"}
                            MenuProps={{ container: portalContainer.current }}
                        >
                            {getActionTypes(entry.target).map(at => <MenuItem key={at.value} value={at.value} sx={{ color: menuTextColor }}>{at.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {entry.actionType === "setValue" && (
                        <TextField type="number" value={entry.value ?? 0}
                            onChange={(e) => {
                                const acts = [...slot.actions];
                                acts[i] = { ...entry, value: parseInt(e.target.value) || 0 };
                                updateActions(acts);
                            }}
                            disabled={!!entry.primary} size="small" sx={{ width: 70 }}
                        />
                    )}
                    {!entry.primary && (
                        <IconButton size="small" onClick={() => {
                            const acts = slot.actions.filter((_, j) => j !== i);
                            updateActions(acts);
                        }}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>
            ))}
            <Button size="small" onClick={() => updateActions([...slot.actions, { target: null, actionType: "on" }])}>
                + Add action
            </Button>
        </Box>
    );
};

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

export const ScheduleCreatorDialog: React.FC<ScheduleCreatorDialogProps> = ({ open, onClose, primaryTarget, editData }) => {
    const portalContainer = usePortalContainerRef();
    const theme = useTheme();
    const menuTextColor = (theme.typography.h2 as React.CSSProperties).color ?? theme.palette.text.primary;
    const allViews = useSelector(selectAllViews);
    const allResources = useSelector(selectAllResources);
    const allScenes = useSelector(selectAllScenes);

    const targets = useMemo((): ScheduleTarget[] => {
        const list: ScheduleTarget[] = [];
        for (const v of allViews) if (v.command) list.push({ kind: "view", id: v.id, label: v.name ?? v.id, item: v });
        for (const r of allResources) if (r.type === "digitalOutput" || r.type === "analogOutput" || r.type === "virtualAnalogOutput") list.push({ kind: "resource", id: r.id, label: r.name ?? r.id, item: r });
        for (const s of allScenes) list.push({ kind: "scene", id: s.id, label: s.name ?? s.id, item: s });
        return list;
    }, [allViews, allResources, allScenes]);

    const targetById = useMemo(() => {
        const map: Record<string, ScheduleTarget> = {};
        for (const t of targets) map[`${t.kind}:${t.id}`] = t;
        return map;
    }, [targets]);

    // Resolve primary target to an action entry
    const primaryEntry = useMemo((): ActionFormEntry | undefined => {
        if (!primaryTarget) return undefined;
        let key: string;
        switch (primaryTarget.kind) {
            case "view": key = `view:${primaryTarget.viewId}`; break;
            case "resource": key = `resource:${primaryTarget.resourceId}`; break;
            case "scene": key = `scene:${primaryTarget.sceneId}`; break;
        }
        const target = targetById[key];
        if (!target) return undefined;
        return { target, actionType: target.kind === "scene" ? "activate" : "on", primary: true };
    }, [primaryTarget, targetById]);

    // Form state
    const [name, setName] = useState(editData?.name ?? (primaryEntry ? defaultScheduleName([primaryEntry]) : ""));
    const [nameManuallyEdited, setNameManuallyEdited] = useState(!!editData);
    const [missedGraceMs, setMissedGraceMs] = useState(editData?.missedGraceMs ?? 0);
    const [slots, setSlots] = useState<SlotFormState[]>(() => {
        if (editData) {
            return editData.slots.map(s => ({
                name: s.name,
                when: whenToFormState(s.when),
                actions: s.actions,
            }));
        }
        return [{
            name: primaryEntry ? defaultSlotName([primaryEntry]) : "",
            when: defaultWhen(),
            actions: primaryEntry ? [primaryEntry] : [],
        }];
    });
    const [createSchedule] = useCreateScheduleMutation();
    const [updateSchedule] = useUpdateScheduleMutation();
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const updateSlot = useCallback((index: number, slot: SlotFormState) => {
        setSlots(prev => prev.map((s, i) => i === index ? slot : s));
    }, []);

    const removeSlot = useCallback((index: number) => {
        setSlots(prev => prev.filter((_, i) => i !== index));
    }, []);

    const addSlot = useCallback(() => {
        setSlots(prev => {
            const last = prev.length > 0 ? prev[prev.length - 1] : undefined;
            const when = last ? { ...last.when } : defaultWhen();
            const actions = last ? last.actions.map(a => ({ ...a, primary: false })) : [];
            return [...prev, { name: "", when, actions }];
        });
    }, []);

    const handleSuggestScheduleName = useCallback((suggested: string) => {
        if (!nameManuallyEdited && suggested) setName(suggested);
    }, [nameManuallyEdited]);

    const canSave = name.trim().length > 0 && slots.length > 0 && slots.every(s => s.actions.length > 0 && s.actions.every(a => a.target));

    const handleSave = useCallback(async () => {
        if (!canSave) return;
        setSaving(true);
        setSaveError(null);
        try {
            const builtSlots: UserScheduleSlot[] = slots.map(s => ({
                name: s.name || "Unnamed",
                when: buildWhen(s.when),
                actions: s.actions.map(resolveAction).filter((a): a is StoredScheduleAction => !!a),
            }));

            const payload: UhnScheduleCreatePayload = {
                name: name.trim(),
                slots: builtSlots,
                missedGraceMs,
            };

            if (editData) {
                await updateSchedule({ id: editData.dbId, payload }).unwrap();
            } else {
                await createSchedule(payload).unwrap();
            }
            onClose();
        } catch {
            setSaveError(editData ? "Failed to update schedule" : "Failed to create schedule");
        } finally {
            setSaving(false);
        }
    }, [canSave, name, slots, onClose]);

    return (
        <LocalizationProvider dateAdapter={AdapterLuxon} adapterLocale="fi">
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth container={portalContainer.current}
            sx={{
                "& .MuiDialog-paper": { m: { xs: 1, sm: 4 }, width: { xs: "calc(100% - 16px)", sm: undefined } },
                "& .MuiDialogContent-root": { px: { xs: 1.5, sm: 3 }, py: { xs: 1, sm: 2 } },
                "& .MuiDialogTitle-root": { px: { xs: 1.5, sm: 3 }, py: { xs: 1, sm: 2 } },
                "& .MuiDialogActions-root": { px: { xs: 1.5, sm: 3 }, py: { xs: 1, sm: 1.5 } },
            }}
        >
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CalendarMonthIcon />
                {editData ? "Edit Schedule" : "New Schedule"}
            </DialogTitle>
            <DialogContent>
                <TextField label="Name" value={name}
                    onChange={(e) => { setName(e.target.value); setNameManuallyEdited(true); }}
                    placeholder="e.g. Engine Heater, Evening Lights"
                    fullWidth size="small" sx={{ mt: 1 }}
                />
                <FormControl size="small" sx={{ mt: 1, mb: 2, minWidth: 200 }}>
                    <InputLabel>If missed, run within</InputLabel>
                    <Select
                        value={missedGraceMs}
                        label="If missed, run within"
                        onChange={(e) => setMissedGraceMs(e.target.value as number)}
                        MenuProps={{ container: portalContainer.current }}
                    >
                        <MenuItem value={0} sx={{ color: menuTextColor }}>Never (skip)</MenuItem>
                        <MenuItem value={300_000} sx={{ color: menuTextColor }}>5 minutes</MenuItem>
                        <MenuItem value={900_000} sx={{ color: menuTextColor }}>15 minutes</MenuItem>
                        <MenuItem value={1_800_000} sx={{ color: menuTextColor }}>30 minutes</MenuItem>
                        <MenuItem value={3_600_000} sx={{ color: menuTextColor }}>1 hour</MenuItem>
                    </Select>
                </FormControl>

                {slots.map((slot, i) => (
                    <SlotEditor
                        key={i}
                        slot={slot}
                        index={i}
                        canRemove={slots.length > 1}
                        targets={targets}
                        menuTextColor={menuTextColor}
                        portalContainer={portalContainer}
                        onChange={updateSlot}
                        onRemove={removeSlot}
                        onSuggestScheduleName={i === 0 ? handleSuggestScheduleName : undefined}
                    />
                ))}

                <Button size="small" onClick={addSlot}>+ Add slot</Button>
            </DialogContent>
            <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 0.5 }}>
                {saveError && (
                    <Typography variant="caption" color="error" sx={{ textAlign: "center" }}>
                        {saveError}
                    </Typography>
                )}
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" disabled={!canSave || saving}>
                        {saving ? "Saving..." : "Save"}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
        </LocalizationProvider>
    );
};
