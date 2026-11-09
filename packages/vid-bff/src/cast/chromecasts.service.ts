import { ChromecastsState } from "@vid/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import axios from "axios";
import { WebSocket } from "ws";
import { VideoServerWebSocketManager } from "../ws/VideoServerWebSocketManager";
import { FoundDevice } from "./cast-discovery";
import { ChromecastWatcher } from "./chromecast-watcher";

const CHROMECASTS_TOPIC = "chromecasts";

/** Every Chromecast that is found on the network, watched, with what plays on it whoever cast it. */
export class ChromecastsService {
    private readonly watchers = new Map<string, ChromecastWatcher>();
    private last = "";

    constructor(
        private readonly wsManager: VideoServerWebSocketManager,
        private readonly clipOf: (contentId: string) => string | undefined
    ) {}

    stop() {
        this.watchers.forEach((watcher) => watcher.stop());
        this.watchers.clear();
    }

    /** Starts watching the device, or again after it came back at another address. */
    watch(device: FoundDevice) {
        this.watchers.get(device.id)?.stop();
        const watcher = new ChromecastWatcher(device, this.clipOf, () => this.publish());
        this.watchers.set(device.id, watcher);
        watcher.start();
        this.publish();
    }

    unwatch(deviceId: string) {
        const watcher = this.watchers.get(deviceId);
        if (watcher) {
            watcher.stop();
            this.watchers.delete(deviceId);
            this.publish();
        }
    }

    getState(): ChromecastsState {
        const devices = [...this.watchers.values()].map((watcher) => watcher.snapshot);
        return { devices: devices.sort((a, b) => a.name.localeCompare(b.name)) };
    }

    subscribe(socket: WebSocket): ChromecastsState {
        this.wsManager.joinTopic(socket, CHROMECASTS_TOPIC);
        return this.getState();
    }

    play(deviceId: string): ChromecastsState {
        return this.command(deviceId, (watcher) => watcher.play());
    }

    pause(deviceId: string): ChromecastsState {
        return this.command(deviceId, (watcher) => watcher.pause());
    }

    seek(deviceId: string, positionSec: number): ChromecastsState {
        return this.command(deviceId, (watcher) => watcher.seek(positionSec));
    }

    /** Stops the app on the device, which ends a cast that this server does not know too. */
    stopCasting(deviceId: string): ChromecastsState {
        return this.command(deviceId, (watcher) => {
            if (!watcher.stopApp()) {
                throw new Error("Nothing runs on the Chromecast");
            }
        });
    }

    async reboot(deviceId: string): Promise<ChromecastsState> {
        const watcher = this.watcher(deviceId);
        try {
            await watcher.reboot();
        } catch (error) {
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            AppLogger.warn(undefined, {
                message: `[Cast] "${watcher.device.name}" (${watcher.device.model}) refused the restart${status ? `: HTTP ${status}` : ""}`,
                error,
            });
            throw new AppErrorV2({
                statusCode: 502,
                code: ErrorCodes.INTERNAL_SERVER_ERROR,
                message: "The Chromecast did not accept the restart",
                originalError: error as Error,
            });
        }
        AppLogger.info(undefined, { message: `[Cast] Restarting "${watcher.device.name}"` });
        return this.getState();
    }

    private watcher(deviceId: string): ChromecastWatcher {
        const watcher = this.watchers.get(deviceId);
        if (!watcher) {
            throw new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "There is no such Chromecast on the network" });
        }
        return watcher;
    }

    private command(deviceId: string, run: (watcher: ChromecastWatcher) => void): ChromecastsState {
        const watcher = this.watcher(deviceId);
        if (!watcher.snapshot.reachable) {
            throw new AppErrorV2({ statusCode: 409, code: ErrorCodes.INVALID_STATE, message: "The Chromecast cannot be reached" });
        }
        try {
            run(watcher);
        } catch (error) {
            throw new AppErrorV2({
                statusCode: 409,
                code: ErrorCodes.INVALID_STATE,
                message: (error as Error).message,
                originalError: error as Error,
            });
        }
        return this.getState();
    }

    /** Pushes the state when it differs from the last push. */
    private publish() {
        const state = this.getState();
        const json = JSON.stringify({
            devices: state.devices.map(({ playback, ...rest }) => ({
                ...rest,
                // While it plays the UI moves the position on by itself; a paused position only changes by a seek.
                playback: playback && { ...playback, updatedAt: 0, positionSec: playback.state === "PAUSED" ? playback.positionSec : 0 },
            })),
        });
        // The time and the position of a reading alone are not a change worth a push.
        if (json === this.last) {
            return;
        }
        this.last = json;
        this.wsManager.broadcastToTopic(CHROMECASTS_TOPIC, { action: "chromecasts_state", success: true, payload: state });
    }
}
