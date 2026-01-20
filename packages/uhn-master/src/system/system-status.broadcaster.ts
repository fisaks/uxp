// system-status.broadcaster.ts
import { UhnSystemStatus } from "@uhn/common";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

class SystemStatusBroadcaster {
    private current: UhnSystemStatus = { state: "idle" };

    publish(status: UhnSystemStatus) {
        this.current = status;
        UHNAppServerWebSocketManager.getInstance().broadcastSystemStatusMessage(status);
    }

    getSnapshot(): UhnSystemStatus {
        return this.current;
    }
}
export const systemStatusBroadcaster = new SystemStatusBroadcaster();