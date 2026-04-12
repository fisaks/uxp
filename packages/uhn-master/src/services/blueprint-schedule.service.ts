import { RuntimeSchedule } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { BlueprintFileUtil } from "../util/blueprint-file.util";
import { blueprintRuntimeSupervisorService } from "./blueprint-runtime-supervisor.service";
import { ruleRuntimeProcessService } from "./rule-runtime-process.service";

export type ScheduleEventMap = {
    schedulesReloaded: [schedules: RuntimeSchedule[]];
    schedulesCleared: [];
};

/**
 * In-memory cache of blueprint schedules loaded from the rule runtime.
 * Listens to runtime IPC events, indexes by ID, and emits reload/clear
 * events consumed by the dispatcher (WS broadcast) and ScheduleFireService.
 */
class BlueprintScheduleService extends EventEmitter<ScheduleEventMap> {
    private schedules: RuntimeSchedule[] = [];
    private scheduleById: Map<string, RuntimeSchedule> = new Map();

    constructor() {
        super();
        ruleRuntimeProcessService.on("onSchedulesLoaded", (msg) => {
            AppLogger.info({
                message: `[BlueprintScheduleService] Schedules loaded from runtime: ${msg.schedules.length} schedule(s).`,
            });
            this.schedules = msg.schedules ?? [];
            this.scheduleById.clear();
            for (const s of this.schedules) {
                this.scheduleById.set(s.id, s);
            }
            this.emit("schedulesReloaded", this.schedules);
            this.writeSchedulesToFile();
        });
        blueprintRuntimeSupervisorService.on("ruleRuntimeStopped", () => {
            this.clearSchedules();
        });
    }

    private clearSchedules() {
        this.schedules = [];
        this.scheduleById.clear();
        this.emit("schedulesCleared");
    }

    private async writeSchedulesToFile() {
        try {
            await BlueprintFileUtil.writePrettyJson("schedules.json", this.schedules);
        } catch (err) {
            AppLogger.error({ message: `[BlueprintScheduleService] Failed to write schedules to file`, error: err });
        }
    }

    getAllSchedules(): RuntimeSchedule[] { return this.schedules; }
    getScheduleById(id: string): RuntimeSchedule | undefined { return this.scheduleById.get(id); }
}

export const blueprintScheduleService = new BlueprintScheduleService();
