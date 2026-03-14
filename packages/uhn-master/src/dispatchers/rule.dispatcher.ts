import { runtimeOverviewService } from "../services/runtime-overview.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

let initialized = false;

export function initRuleDispatcher(): void {
    if (initialized) return;
    initialized = true;

    runtimeOverviewService.on("rulesChanged", (rules) => {
        UHNAppServerWebSocketManager.getInstance().broadcastRulesMessage({ rules });
    });
}
