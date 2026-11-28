import { VideoServerWebSocketManager } from "../ws/VideoServerWebSocketManager";

/** Knows whether any scan of the media folders runs, and tells every connection when that changes. */
export class ScanTracker {
    private running = 0;

    constructor(private readonly wsManager: VideoServerWebSocketManager) {}

    get scanning(): boolean {
        return this.running > 0;
    }

    async track(scan: () => Promise<void>): Promise<void> {
        if (this.running++ === 0) {
            this.publish();
        }
        try {
            await scan();
        } finally {
            if (--this.running === 0) {
                this.publish();
            }
        }
    }

    private publish(): void {
        this.wsManager.broadcast({ action: "library_state", success: true, payload: { scanning: this.scanning } });
    }
}

export const scanTracker = new ScanTracker(VideoServerWebSocketManager.getInstance());
