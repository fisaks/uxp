import { PlatformHealthService } from "../services/platform-health.service";
import { UxpServerWebSocketManager } from "../websocket/UxpServerWebSocketManager";

let initialized = false;

export function initUxpHealthDispatcher(): void {
    if (initialized) return;
    initialized = true;

    PlatformHealthService.on("healthChanged", (snapshot) => {
        UxpServerWebSocketManager.getInstance().broadcastHealthSnapshot(snapshot);
    });
}
