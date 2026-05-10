import { ScheduleWhen, SunEvent } from "@uhn/blueprint";
import type {
    RuntimeAnalogOutputResource,
    RuntimeDigitalInputResource,
    RuntimeInteractionView,
    RuntimeResource,
    RuntimeVirtualAnalogOutputResource,
} from "@uhn/common";

/* ------------------------------------------------------------------ */
/* When / cron description                                             */
/* ------------------------------------------------------------------ */

const CRON_DAY_OF_WEEK_NAMES: Record<string, string> = {
    "*": "Every day", "1-5": "Weekdays", "0,6": "Weekends",
    "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat",
};

// Index 0 is empty so months can be accessed directly by 1-based number (MONTH_NAMES[1] = "Jan").
const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SUN_EVENT_LABELS: Record<SunEvent, string> = {
    dawn: "When it gets light", sunrise: "Sunrise", goldenHourEnd: "Golden hour end",
    solarNoon: "Solar noon", goldenHour: "Golden hour start", sunset: "Sunset",
    dusk: "When it gets dark", night: "Fully dark",
};

export function describeCron(expression: string): string {
    if (!expression) return "Invalid cron";
    const parts = expression.split(" ");
    if (parts.length !== 5) return expression;
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    const time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
    if (dayOfMonth !== "*" && month !== "*" && dayOfWeek === "*") {
        const m = parseInt(month);
        return `${dayOfMonth} ${MONTH_NAMES[m] ?? month} ${time}`;
    }
    if (dayOfMonth !== "*" && month === "*" && dayOfWeek === "*") {
        return `${dayOfMonth}. every month ${time}`;
    }
    const dayLabel = CRON_DAY_OF_WEEK_NAMES[dayOfWeek]
        ?? dayOfWeek.split(",").map(d => CRON_DAY_OF_WEEK_NAMES[d] ?? d).join(", ");
    return `${dayLabel} ${time}`;
}

export function describeWhen(when: ScheduleWhen): string {
    switch (when.kind) {
        case "cron": return describeCron(when.expression);
        case "sun": {
            const label = SUN_EVENT_LABELS[when.event] ?? when.event;
            const offset = when.offsetMinutes;
            if (!offset) return label;
            return `${label} ${offset > 0 ? "+" : ""}${offset}min`;
        }
        case "date": return when.year ? `${when.day}.${when.month}.${when.year} ${when.time}` : `${when.day}/${when.month} ${when.time}`;
    }
}

/* ------------------------------------------------------------------ */
/* Resource type guards                                                */
/* ------------------------------------------------------------------ */

export function isDigitalInput(r: RuntimeResource): r is RuntimeDigitalInputResource {
    return r.type === "digitalInput";
}

export function isAnalogOutput(r: RuntimeResource): r is RuntimeAnalogOutputResource {
    return r.type === "analogOutput";
}

export function isVirtualAnalogOutput(r: RuntimeResource): r is RuntimeVirtualAnalogOutputResource {
    return r.type === "virtualAnalogOutput";
}

export function isPushInput(r: RuntimeResource): boolean {
    return isDigitalInput(r) && r.inputType === "push";
}

export function isPushCommand(view: RuntimeInteractionView): boolean {
    return view.command?.type === "tap";
}
