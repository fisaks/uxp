// cron.ts — Fluent cron expression builder
// Returns string[] (one or more cron expressions).
//
// Usage:
//   cron.weekdays().at("07:00")                          // ["0 7 * * 1-5"]
//   cron.daily().at("07:00").at("19:00")                 // ["0 7 * * *", "0 19 * * *"]
//   cron.days("mon", "wed").at("18:30")                  // ["30 18 * * 1,3"]
//   cron.month("dec").day(24).at("15:00")                // ["0 15 24 12 *"]
//   cron.day(24).month("dec").at("15:00")                // ["0 15 24 12 *"]
//   cron.months("jun", "jul", "aug").day(1).at("08:00")  // ["0 8 1 6,7,8 *"]
//   cron.day(1).at("00:00")                              // ["0 0 1 * *"]
//   cron.month("dec").at("08:00")                        // ["0 8 * 12 *"]
//   cron.every(30).minutes()                             // ["*/30 * * * *"]
//   cron.every(2).hours()                                // ["0 */2 * * *"]

type DayName = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type MonthName = "jan" | "feb" | "mar" | "apr" | "may" | "jun" | "jul" | "aug" | "sep" | "oct" | "nov" | "dec";
type MonthInput = number | MonthName;

const DAY_MAP: Record<DayName, number> = {
    mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0,
};

const MONTH_MAP: Record<MonthName, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function resolveMonth(m: MonthInput): number {
    if (typeof m === "number") {
        if (m < 1 || m > 12) throw new Error(`Invalid month ${m}. Must be 1-12.`);
        return m;
    }
    const n = MONTH_MAP[m];
    if (n === undefined) throw new Error(`Unknown month "${m}". Use: jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec.`);
    return n;
}

/* ------------------------------------------------------------------ */
/* Builder types                                                       */
/* ------------------------------------------------------------------ */

type CronFields = {
    dayOfMonth: string;
    month: string;
    dayOfWeek: string;
};

type CronAtBuilder = {
    /** Add a time to fire at (HH:mm). Can chain multiple .at() calls. */
    at(time: string): CronAtBuilder;
    /** Returns the built cron expression(s). Called automatically via valueOf/toString. */
    build(): string[];
};

/** Builder that can still accept month and/or day-of-month before .at(). */
type CronCalendarBuilder = CronAtBuilder & {
    /** Restrict to specific month(s) (1-12 or name). */
    month(m: MonthInput): CronCalendarBuilder;
    months(...m: MonthInput[]): CronCalendarBuilder;
    /** Restrict to a specific day of the month (1-31). */
    day(d: number): CronCalendarBuilder;
};

type CronIntervalBuilder = {
    minutes(): string[];
    hours(): string[];
};

/* ------------------------------------------------------------------ */
/* Internal builders                                                   */
/* ------------------------------------------------------------------ */

function parseTime(time: string): { minute: number; hour: number } {
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
        throw new Error(`Invalid time format "${time}". Expected HH:mm (e.g. "07:00", "18:30").`);
    }
    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    if (hour < 0 || hour > 23) throw new Error(`Invalid hour ${hour} in time "${time}".`);
    if (minute < 0 || minute > 59) throw new Error(`Invalid minute ${minute} in time "${time}".`);
    return { hour, minute };
}

function buildExpressions(fields: CronFields, times: Array<{ minute: number; hour: number }>): string[] {
    if (times.length === 0) {
        throw new Error("Cron builder: at least one .at() call is required.");
    }
    return times.map(({ minute, hour }) =>
        `${minute} ${hour} ${fields.dayOfMonth} ${fields.month} ${fields.dayOfWeek}`
    );
}

function createCalendarBuilder(fields: CronFields): CronCalendarBuilder {
    const times: Array<{ minute: number; hour: number }> = [];

    const builder: CronCalendarBuilder = {
        at(time: string) {
            times.push(parseTime(time));
            return builder;
        },
        month(m: MonthInput) {
            fields = { ...fields, month: String(resolveMonth(m)) };
            return builder;
        },
        months(...months: MonthInput[]) {
            if (months.length === 0) throw new Error("months() requires at least one month.");
            fields = { ...fields, month: months.map(resolveMonth).join(",") };
            return builder;
        },
        day(d: number) {
            if (d < 1 || d > 31) throw new Error(`Invalid day of month ${d}. Must be 1-31.`);
            fields = { ...fields, dayOfMonth: String(d) };
            return builder;
        },
        build() {
            return buildExpressions(fields, times);
        },
    };

    // Make it behave as string[] when used in contexts that coerce
    return new Proxy(builder, {
        get(target, prop) {
            if (prop === Symbol.toPrimitive || prop === "toString" || prop === "valueOf") {
                return () => target.build();
            }
            if (prop === Symbol.iterator) {
                return () => target.build()[Symbol.iterator]();
            }
            if (prop === "length") {
                return target.build().length;
            }
            return (target as any)[prop];
        },
    }) as CronCalendarBuilder;
}

function createAtOnlyBuilder(fields: CronFields): CronAtBuilder {
    const times: Array<{ minute: number; hour: number }> = [];

    const builder: CronAtBuilder = {
        at(time: string) {
            times.push(parseTime(time));
            return builder;
        },
        build() {
            return buildExpressions(fields, times);
        },
    };

    return new Proxy(builder, {
        get(target, prop) {
            if (prop === Symbol.toPrimitive || prop === "toString" || prop === "valueOf") {
                return () => target.build();
            }
            if (prop === Symbol.iterator) {
                return () => target.build()[Symbol.iterator]();
            }
            if (prop === "length") {
                return target.build().length;
            }
            return (target as any)[prop];
        },
    }) as CronAtBuilder;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export const cron = {
    /** Every day. */
    daily(): CronAtBuilder {
        return createAtOnlyBuilder({ dayOfMonth: "*", month: "*", dayOfWeek: "*" });
    },

    /** Monday through Friday. */
    weekdays(): CronAtBuilder {
        return createAtOnlyBuilder({ dayOfMonth: "*", month: "*", dayOfWeek: "1-5" });
    },

    /** Saturday and Sunday. */
    weekends(): CronAtBuilder {
        return createAtOnlyBuilder({ dayOfMonth: "*", month: "*", dayOfWeek: "0,6" });
    },

    /** Specific days of the week. */
    days(...days: DayName[]): CronAtBuilder {
        if (days.length === 0) throw new Error("cron.days() requires at least one day.");
        const nums = days.map(d => {
            const n = DAY_MAP[d];
            if (n === undefined) throw new Error(`Unknown day "${d}". Use: mon, tue, wed, thu, fri, sat, sun.`);
            return n;
        });
        return createAtOnlyBuilder({ dayOfMonth: "*", month: "*", dayOfWeek: nums.join(",") });
    },

    /** Specific month (1-12 or name). Chain with .day() and/or .at(). */
    month(m: MonthInput): CronCalendarBuilder {
        return createCalendarBuilder({ dayOfMonth: "*", month: String(resolveMonth(m)), dayOfWeek: "*" });
    },

    /** Multiple months (1-12 or names). Chain with .day() and/or .at(). */
    months(...months: MonthInput[]): CronCalendarBuilder {
        if (months.length === 0) throw new Error("cron.months() requires at least one month.");
        return createCalendarBuilder({ dayOfMonth: "*", month: months.map(resolveMonth).join(","), dayOfWeek: "*" });
    },

    /** Specific day of the month (1-31). Chain with .month() and/or .at(). */
    day(d: number): CronCalendarBuilder {
        if (d < 1 || d > 31) throw new Error(`Invalid day of month ${d}. Must be 1-31.`);
        return createCalendarBuilder({ dayOfMonth: String(d), month: "*", dayOfWeek: "*" });
    },

    /** Recurring interval: cron.every(N).minutes() or cron.every(N).hours(). */
    every(n: number): CronIntervalBuilder {
        if (n < 1) throw new Error("Interval must be >= 1.");
        return {
            minutes(): string[] {
                return [`*/${n} * * * *`];
            },
            hours(): string[] {
                return [`0 */${n} * * *`];
            },
        };
    },
};
