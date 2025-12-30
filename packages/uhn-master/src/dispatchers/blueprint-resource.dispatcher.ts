import { blueprintResourceService } from "../services/blueprint-resource.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

let initialized = false;

export function initBlueprintResourceDispatcher(): void {
    if (initialized) return;
    initialized = true;

    blueprintResourceService.on("resourcesReloaded", (resource) => {
        UHNAppServerWebSocketManager.getInstance().broadcastResourcesMessage({
            resources: resource
        });
    });
    blueprintResourceService.on("resourcesCleared", () => {
        UHNAppServerWebSocketManager.getInstance().broadcastResourcesMessage({
            resources: []
        });
    });
    blueprintResourceService.on("error", (_) => {
    });

}

