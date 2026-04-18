import type { BlueprintPhase, BlueprintSchedule } from "@uhn/blueprint";
import { humanizeScheduleId, RuntimePhase, RuntimeSchedule } from "@uhn/common";
import fs from "fs-extra";
import path from "path";
import { runtimeOutput } from "../io/runtime-output";

function isScheduleObject(obj: unknown): obj is BlueprintSchedule {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "id" in obj &&
        typeof (obj as any).id === "string" &&
        "phases" in obj &&
        typeof (obj as any).phases === "object" &&
        "missedGraceMs" in obj
    );
}

function serializePhase(phase: BlueprintPhase, scheduleId: string): RuntimePhase {
    if (!phase.id) throw new Error(`Phase missing id in schedule "${scheduleId}"`);
    return {
        id: phase.id,
        name: phase.name,
        scheduleId,
        when: phase.when,
    };
}

function serializeSchedule(schedule: BlueprintSchedule): RuntimeSchedule {
    return {
        id: schedule.id!,
        name: schedule.name ?? humanizeScheduleId(schedule.id!),
        description: schedule.description,
        keywords: schedule.keywords,
        phases: Object.values(schedule.phases).map(phase => serializePhase(phase, schedule.id!)),
        missedGraceMs: schedule.missedGraceMs,
    };
}

async function collectSchedules(schedulesDir: string): Promise<BlueprintSchedule[]> {
    if (!(await fs.pathExists(schedulesDir))) {
        return [];
    }
    const schedules: BlueprintSchedule[] = [];

    async function walk(dir: string) {
        const entries = await fs.readdir(dir);
        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) { await walk(fullPath); continue; }
            if (!stat.isFile() || !entry.endsWith(".js")) continue;

            const mod = require(fullPath);
            for (const [exportName, obj] of Object.entries(mod)) {
                if (isScheduleObject(obj)) {
                    schedules.push(obj);
                } else {
                    runtimeOutput.log({
                        level: "warn",
                        component: "RuntimeScheduleService",
                        message: `Skipped non-schedule export "${exportName}" in "${fullPath}"`,
                    });
                }
            }
        }
    }
    await walk(schedulesDir);
    return schedules;
}

export class RuntimeScheduleService {
    private schedules: BlueprintSchedule[];
    /** Resolve phaseId → BlueprintPhase (flattened from all schedules). */
    private phaseById: Map<string, BlueprintPhase>;

    private constructor(schedules: BlueprintSchedule[]) {
        this.schedules = schedules;
        this.phaseById = new Map();
        for (const s of schedules) {
            for (const phase of Object.values(s.phases)) {
                phase.scheduleId = s.id;
                this.phaseById.set(`${s.id}.${phase.id}`, phase);
            }
        }
    }

    static async create(schedulesDir: string): Promise<RuntimeScheduleService> {
        const schedules = await collectSchedules(schedulesDir);
        runtimeOutput.log({
            level: "info",
            component: "RuntimeScheduleService",
            message: `Loaded ${schedules.length} schedule(s) with ${schedules.reduce((n, s) => n + Object.keys(s.phases).length, 0)} phase(s).`,
        });
        return new RuntimeScheduleService(schedules);
    }

    /** Resolve a phase by composite key (scheduleId.phaseId). */
    getPhase(scheduleId: string, phaseId: string): BlueprintPhase | undefined {
        return this.phaseById.get(`${scheduleId}.${phaseId}`);
    }

    /** Serialized list for IPC transport. */
    list(): RuntimeSchedule[] {
        return this.schedules.map(serializeSchedule);
    }
}
