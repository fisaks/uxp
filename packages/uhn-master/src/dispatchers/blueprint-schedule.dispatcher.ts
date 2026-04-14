import { runBackgroundTask } from "@uxp/bff-common";
import { blueprintScheduleService } from "../services/blueprint-schedule.service";
import { scheduleMuteService } from "../services/schedule-mute.service";
import { userScheduleService } from "../services/user-schedule.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";
const { AppDataSource } = require("../db/typeorm.config");

let initialized = false;

export function initBlueprintScheduleDispatcher(): void {
    if (initialized) return;
    initialized = true;

    blueprintScheduleService.on("schedulesReloaded", () => {
        broadcastAllSchedules();
    });
    blueprintScheduleService.on("schedulesCleared", () => {
        UHNAppServerWebSocketManager.getInstance().broadcastSchedulesMessage({
            schedules: [],
            userSchedules: [],
            mutes: [],
        });
    });
}

/**
 * Broadcast the merged schedule state (blueprint + user + mutes) to all WS clients.
 * Called after blueprint reload or user schedule mutations.
 */
export async function broadcastAllSchedules(): Promise<void> {
    await runBackgroundTask(AppDataSource, async () => {
        const schedules = blueprintScheduleService.getAllSchedules();
        const userSchedules = await userScheduleService.listForActiveBlueprint();
        const mutes = await scheduleMuteService.listMutesForActiveBlueprint();

        UHNAppServerWebSocketManager.getInstance().broadcastSchedulesMessage({
            schedules,
            userSchedules,
            mutes,
        });
    });
}
