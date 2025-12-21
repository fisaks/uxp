import { AppLogger } from "@uxp/bff-common";
import { blueprintRuntimeStateService } from "../services/blueprint-runtime-state.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

export class BlueprintRuntimeStateDispatcher {
    private static initialized = false;
    constructor() {
        if (BlueprintRuntimeStateDispatcher.initialized) {
            return;
        }
        blueprintRuntimeStateService.on("resourceStateChanged", (resourceId, stateValue, timestamp) => {
            UHNAppServerWebSocketManager.getInstance().broadcastRuntimeStateMessage({
                state: { resourceId, value: stateValue, timestamp }
            });
        });
        blueprintRuntimeStateService.on("stateReset", () => {
            AppLogger.info({ message: "[BlueprintRuntimeStateDispatcher] Blueprint runtime state reset detected, broadcasting empty state message." });
            UHNAppServerWebSocketManager.getInstance().broadcastRuntimeStatesMessage({
                states: []
            });
        });

        BlueprintRuntimeStateDispatcher.initialized = true;
    }

}