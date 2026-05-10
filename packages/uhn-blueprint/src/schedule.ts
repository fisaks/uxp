// schedule.ts — Blueprint schedule entity with typed phases.
//
// A schedule groups named phases. Each phase has one when (time trigger).
// Rules trigger on individual phases via onPhase().
// User schedules use unnamed slots (each with when + actions).
//
// Usage:
//   export const engineHeater = schedule({ name: "Engine Heater" })
//     .phase("on", cron.weekdays().at("06:00"))
//     .phase("off", cron.weekdays().at("08:00"))
//     .missedGrace(minutes(60));
//
//   // Typed phase access:
//   rule({ id: "heaterConditional" })
//     .onPhase(engineHeater.phases.on)
//     .run((ctx) => { ... });
//
//   export const eveningLights = schedule({ name: "Evening Lights" })
//     .phase("lightsOn", { kind: "sun", event: "dusk", offsetMinutes: -15 })
//     .phase("lightsOff", cron.daily().at("23:00"));

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
    | { kind: "sun"; event: SunEvent; offsetMinutes?: number }
    | { kind: "date"; month: number; day: number; time: string; year?: number };

export type BlueprintPhase = {
    /** Machine-safe identifier, generated from name (camelCase, no spaces). */
    id?: string;
    /** Human-readable name as provided in .phase(). */
    name: string;
    when: ScheduleWhen;
    /** Back-reference to parent schedule (injected at runtime). */
    scheduleId?: string;
};

export type BlueprintSchedule<TPhases extends Record<string, BlueprintPhase> = Record<string, BlueprintPhase>> = {
    id?: string;
    name?: string;
    description?: string;
    keywords?: string[];
    phases: TPhases;
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
        "phases" in obj &&
        typeof (obj as any).phases === "object" &&
        "missedGraceMs" in obj
    );
};

export const isBlueprintPhase = (obj: unknown): obj is BlueprintPhase => {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "when" in obj &&
        typeof (obj as any).when === "object"
    );
};

/* ------------------------------------------------------------------ */
/* Helpers: resolve ScheduleWhen from various inputs                    */
/* ------------------------------------------------------------------ */

/** Convert a human-readable name to a machine-safe camelCase id. */
function nameToId(name: string): string {
    return name
        .trim()
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .split(/\s+/)
        .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join("");
}

/** A phase when can be a ScheduleWhen object or a cron expression string (from cron builder). */
type PhaseWhenInput = ScheduleWhen | string;

function resolveWhen(input: PhaseWhenInput): ScheduleWhen {
    if (typeof input === "string") {
        validateCronFormat(input);
        return { kind: "cron", expression: input };
    }
    if (input.kind === "cron") validateCronFormat(input.expression);
    return input;
}

/* ------------------------------------------------------------------ */
/* Fluent builder                                                      */
/* ------------------------------------------------------------------ */

export type ScheduleBuilder<TPhases extends Record<string, BlueprintPhase> = {}> = {
    /** Add a named phase with a time trigger. */
    phase<K extends string>(
        name: K,
        when: PhaseWhenInput
    ): ScheduleBuilder<TPhases & Record<K, BlueprintPhase>>;

    /** Set the missed-event grace window in ms (applies to all phases). */
    missedGrace(ms: number): ScheduleBuilder<TPhases>;
    /** Never fire if missed (equivalent to missedGrace(0)). */
    noGrace(): ScheduleBuilder<TPhases>;

    /** The typed phases object. */
    phases: TPhases;

    /** Finalize and return the schedule object. */
    build(): BlueprintSchedule<TPhases>;
};

export function schedule(props?: {
    id?: string;
    name?: string;
    description?: string;
    keywords?: string[];
}): ScheduleBuilder {
    const phases: Record<string, BlueprintPhase> = {};
    let missedGraceMs = DEFAULT_MISSED_GRACE_MS;

    const builder: ScheduleBuilder<any> = {
        phase(name: string, whenInput: PhaseWhenInput) {
            if (name in phases) {
                throw new Error(`Duplicate phase name "${name}" in schedule.`);
            }
            const id = nameToId(name);
            if (Object.values(phases).some(p => p.id === id)) {
                throw new Error(`Duplicate phase id "${id}" in schedule (generated from name "${name}").`);
            }
            const when = resolveWhen(whenInput);
            const phase: BlueprintPhase = { id, name, when };
            phases[name] = phase;
            return builder;
        },

        missedGrace(ms: number) {
            missedGraceMs = ms;
            return builder;
        },

        noGrace() {
            missedGraceMs = 0;
            return builder;
        },

        get phases() {
            return phases;
        },

        build() {
            return {
                id: props?.id,
                name: props?.name,
                description: props?.description,
                keywords: props?.keywords,
                phases,
                missedGraceMs,
            };
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
