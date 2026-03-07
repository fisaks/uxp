import { blueprintViewService } from "../services/blueprint-view.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

let initialized = false;

export function initBlueprintViewDispatcher(): void {
    if (initialized) return;
    initialized = true;

    blueprintViewService.on("viewsReloaded", (views) => {
        UHNAppServerWebSocketManager.getInstance().broadcastViewsMessage({ views });
    });
    blueprintViewService.on("viewsCleared", () => {
        UHNAppServerWebSocketManager.getInstance().broadcastViewsMessage({ views: [] });
    });
}
