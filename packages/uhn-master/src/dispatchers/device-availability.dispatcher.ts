import { deviceAvailabilityService } from "../services/device-availability.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

let initialized = false;

export function initDeviceAvailabilityDispatcher(): void {
    if (initialized) return;
    initialized = true;

    deviceAvailabilityService.on("availabilityChanged", (entry) => {
        UHNAppServerWebSocketManager.getInstance().broadcastAvailabilityChangeMessage(entry);
    });
}
