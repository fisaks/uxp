// schedule.ts — Blueprint schedule entity & fluent builder
//
// Usage:
//   export const morningRoutine = schedule()
//     .cron(cron.weekdays().at("07:00"))
//     .missedGrace(minutes(15));
//
//   export const eveningLights = schedule({ description: "Lights for dark evenings" })
//     .at("dusk", { offset: -15 })
//     .at("sunset");
//
//   export const holidays = schedule()
//     .date(12, 24, "15:00")
//     .date(12, 25, "08:00")
//     .noGrace();

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type SunEvent =
    | "dawn"
    | "sunrise"
    | "goldenHourEnd"
    | "solarNoon"
    | "goldenHour"
    | "sunset"
    | "dusk"
    | "night";

export type ScheduleWhen =
    | { kind: "cron"; expression: string }
    | { kind: "sun"; event: SunEvent; offsetMinutes: number }
    | { kind: "date"; month: number; day: number; time: string };

export type BlueprintSchedule = {
    id?: string;
    name?: string;
    description?: string;
    keywords?: string[];
    when: ScheduleWhen[];
    /** Grace window in ms. If the system was down and missed a fire, it will still
     *  fire if the missed time is within this window. 0 = always skip. Default: 15 minutes. */
    missedGraceMs: number;
};

const DEFAULT_MISSED_GRACE_MS = 15 * 60_000; // 15 minutes

/* ------------------------------------------------------------------ */
/* Type guard                                                          */
/* ------------------------------------------------------------------ */

export const isBlueprintSchedule = (obj: unknown): obj is BlueprintSchedule => {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "when" in obj &&
        Array.isArray((obj as any).when) &&
        "missedGraceMs" in obj
    );
};

/* ------------------------------------------------------------------ */
/* Fluent builder                                                      */
/* ------------------------------------------------------------------ */

export type ScheduleBuilder = {
    /** Add one or more cron expressions. Accepts a raw string or the result of the cron builder. */
    cron(expressions: string | string[]): ScheduleBuilder;
    /** Add a sun-event trigger with optional offset in minutes. */
    at(event: SunEvent, opts?: { offset?: number }): ScheduleBuilder;
    /** Add an annual date trigger (month 1-12, day 1-31, time "HH:mm"). */
    date(month: number, day: number, time: string): ScheduleBuilder;
    /** Set the missed-event grace window in ms. */
    missedGrace(ms: number): ScheduleBuilder;
    /** Never fire if missed (equivalent to missedGrace(0)). */
    noGrace(): ScheduleBuilder;

    /** Finalize and return the schedule object. Also called implicitly by the build pipeline. */
    build(): BlueprintSchedule;
};

export function schedule(props?: {
    id?: string;
    name?: string;
    description?: string;
    keywords?: string[];
}): ScheduleBuilder {
    const data: BlueprintSchedule = {
        id: props?.id,
        name: props?.name,
        description: props?.description,
        keywords: props?.keywords,
        when: [],
        missedGraceMs: DEFAULT_MISSED_GRACE_MS,
    };

    const builder: ScheduleBuilder = {
        cron(expressions) {
            const arr = typeof expressions === "string" ? [expressions] : expressions;
            for (const expr of arr) {
                validateCronFormat(expr);
                data.when.push({ kind: "cron", expression: expr });
            }
            return builder;
        },

        at(event, opts) {
            data.when.push({
                kind: "sun",
                event,
                offsetMinutes: opts?.offset ?? 0,
            });
            return builder;
        },

        date(month, day, time) {
            if (month < 1 || month > 12) throw new Error(`Invalid month ${month}. Must be 1-12.`);
            if (day < 1 || day > 31) throw new Error(`Invalid day ${day}. Must be 1-31.`);
            if (!/^\d{1,2}:\d{2}$/.test(time)) throw new Error(`Invalid time "${time}". Expected HH:mm.`);
            data.when.push({ kind: "date", month, day, time });
            return builder;
        },

        missedGrace(ms) {
            data.missedGraceMs = ms;
            return builder;
        },

        noGrace() {
            data.missedGraceMs = 0;
            return builder;
        },

        build() {
            return data;
        },
    };

    return builder;
}

/* ------------------------------------------------------------------ */
/* Cron format validation (lightweight, no external dependency)        */
/* ------------------------------------------------------------------ */

/** Validates that a string looks like a 5-field cron expression.
 *  Does not validate value ranges exhaustively — that's for the build pipeline. */
const CRON_FIELD = /^(\*|\d+(-\d+)?(\/\d+)?)(,(\*|\d+(-\d+)?(\/\d+)?))*$|^\*\/\d+$/;

function validateCronFormat(expr: string): void {
    const fields = expr.trim().split(/\s+/);
    if (fields.length !== 5) {
        throw new Error(
            `Invalid cron expression "${expr}". Expected 5 fields (minute hour day month weekday), got ${fields.length}.`
        );
    }
    for (const field of fields) {
        if (!CRON_FIELD.test(field)) {
            throw new Error(
                `Invalid cron field "${field}" in expression "${expr}".`
            );
        }
    }
}
