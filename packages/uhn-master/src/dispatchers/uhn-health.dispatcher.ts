import { uhnHealthService } from "../services/uhn-health.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

let initialized = false;

export function initUhnHealthDispatcher(): void {
    if (initialized) return;
    initialized = true;

    uhnHealthService.on("healthChanged", (healthSnapshot) => {
        UHNAppServerWebSocketManager.getInstance().broadcastHealthMessage(healthSnapshot);
    });
}

