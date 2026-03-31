import { AppLogger, IsProd, runBackgroundTask } from "@uxp/bff-common";
import { initUxpHealthDispatcher } from "./dispatchers/uxp-health.dispatcher";
import { notificationChannelService } from "./services/notification/notification.service";
import { PlatformHealthService } from "./services/platform-health.service";

const { AppDataSource } = require("./db/typeorm.config");

export async function startUxpRuntime() {

    if (!IsProd) {
        try {
            const { applyDevConfig } = await import("./uxp.dev");
            await applyDevConfig(AppDataSource);
        } catch (err) {
            console.error("Failed to apply dev config:", err);
        }
    }

    setupDispatchers();
    await runStartupBackgroundTasks();

}

async function runStartupBackgroundTasks() {

    try {
        await runBackgroundTask(AppDataSource, async () => {
            notificationChannelService.init();
            await PlatformHealthService.init();
        });
    } catch (error) {
        AppLogger.error({
            message: `Failed to start uxp background tasks`,
            error,
        });
    }

}

function setupDispatchers() {
    initUxpHealthDispatcher();
}
