import type { BlueprintSchedule } from "@uhn/blueprint";
import { humanizeScheduleId, RuntimeSchedule } from "@uhn/common";
import fs from "fs-extra";
import path from "path";
import { runtimeOutput } from "../io/runtime-output";

function isScheduleObject(obj: unknown): obj is BlueprintSchedule {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "id" in obj &&
        typeof (obj as any).id === "string" &&
        "when" in obj &&
        Array.isArray((obj as any).when) &&
        "missedGraceMs" in obj
    );
}

function serializeSchedule(schedule: BlueprintSchedule): RuntimeSchedule {
    return {
        id: schedule.id!,
        name: schedule.name ?? humanizeScheduleId(schedule.id!),
        description: schedule.description,
        keywords: schedule.keywords,
        when: schedule.when,
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
    private byId: Map<string, BlueprintSchedule>;

    private constructor(schedules: BlueprintSchedule[]) {
        this.schedules = schedules;
        this.byId = new Map(schedules.map(s => [s.id!, s]));
    }

    static async create(schedulesDir: string): Promise<RuntimeScheduleService> {
        const schedules = await collectSchedules(schedulesDir);
        runtimeOutput.log({
            level: "info",
            component: "RuntimeScheduleService",
            message: `Loaded ${schedules.length} schedule(s).`,
        });
        return new RuntimeScheduleService(schedules);
    }

    /** Resolve a scheduleId to the full BlueprintSchedule object. */
    getById(scheduleId: string): BlueprintSchedule | undefined {
        return this.byId.get(scheduleId);
    }

    /** Serialized list for IPC transport. */
    list(): RuntimeSchedule[] {
        return this.schedules.map(serializeSchedule);
    }
}
