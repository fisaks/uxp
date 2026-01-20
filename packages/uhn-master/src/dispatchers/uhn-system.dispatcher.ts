import { uhnSystemSnapshotService } from "../services/uhn-system-snapshot.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

let initialized = false;

export function initUhnSystemDispatcher(): void {
    if (initialized) return;
    initialized = true;

    uhnSystemSnapshotService.on("snapshotChanged", (snapshot) => {
        UHNAppServerWebSocketManager.getInstance().broadcastSystemSnapshotMessage(snapshot);
    });
}

