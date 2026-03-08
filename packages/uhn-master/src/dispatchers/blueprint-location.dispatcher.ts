import { blueprintLocationService } from "../services/blueprint-location.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

let initialized = false;

export function initBlueprintLocationDispatcher(): void {
    if (initialized) return;
    initialized = true;

    blueprintLocationService.on("locationsReloaded", (locations) => {
        UHNAppServerWebSocketManager.getInstance().broadcastLocationsMessage({ locations });
    });
    blueprintLocationService.on("locationsCleared", () => {
        UHNAppServerWebSocketManager.getInstance().broadcastLocationsMessage({ locations: [] });
    });
}
