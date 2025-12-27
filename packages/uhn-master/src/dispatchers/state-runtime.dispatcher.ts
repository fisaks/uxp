import { AppLogger } from "@uxp/bff-common";
import { stateRuntimeService } from "../services/state-runtime.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

export class StateRuntimeDispatcher {
    private static initialized = false;
    constructor() {
        if (StateRuntimeDispatcher.initialized) {
            return;
        }
        stateRuntimeService.on("runtimeStateChanged", (resourceId, stateValue, timestamp) => {
            UHNAppServerWebSocketManager.getInstance().broadcastRuntimeStateMessage({
                state: { resourceId, value: stateValue, timestamp }
            });
        });
        stateRuntimeService.on("runtimeStateReset", () => {
            AppLogger.info({ message: "[StateRuntimeDispatcher] State runtime state reset detected, broadcasting empty state message." });
            UHNAppServerWebSocketManager.getInstance().broadcastRuntimeStatesMessage({
                states: []
            });
        });

        StateRuntimeDispatcher.initialized = true;
    }

}