import { blueprintScheduleService } from "../services/blueprint-schedule.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

let initialized = false;

export function initBlueprintScheduleDispatcher(): void {
    if (initialized) return;
    initialized = true;

    blueprintScheduleService.on("schedulesReloaded", (schedules) => {
        UHNAppServerWebSocketManager.getInstance().broadcastSchedulesMessage({ schedules });
    });
    blueprintScheduleService.on("schedulesCleared", () => {
        UHNAppServerWebSocketManager.getInstance().broadcastSchedulesMessage({ schedules: [] });
    });
}
