import { blueprintSceneService } from "../services/blueprint-scene.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

let initialized = false;

export function initBlueprintSceneDispatcher(): void {
    if (initialized) return;
    initialized = true;

    blueprintSceneService.on("scenesReloaded", (scenes) => {
        UHNAppServerWebSocketManager.getInstance().broadcastScenesMessage({ scenes });
    });
    blueprintSceneService.on("scenesCleared", () => {
        UHNAppServerWebSocketManager.getInstance().broadcastScenesMessage({ scenes: [] });
    });
}
