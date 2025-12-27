import { blueprintResourceService } from "../services/blueprint-resource.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

export class BlueprintResourceDispatcher {
    private static initialized = false;
    constructor() {
        if (BlueprintResourceDispatcher.initialized) {
            return;
        }
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
        BlueprintResourceDispatcher.initialized = true;
    }

}