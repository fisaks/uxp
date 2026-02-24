import { runtimeOverviewService } from "../services/runtime-overview.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

let initialized = false;

export function initRuntimeOverviewDispatcher(): void {
    if (initialized) return;
    initialized = true;

    runtimeOverviewService.on("overviewChanged", (payload) => {
        UHNAppServerWebSocketManager.getInstance().broadcastRuntimeOverview(payload);
    });
}
