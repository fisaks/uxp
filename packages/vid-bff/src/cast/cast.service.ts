import { CastState } from "@vid/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { WebSocket } from "ws";
import { homeVideoService } from "../home-video/home-video.service";
import { signStreamQuery } from "../stream/signed-url";
import { VideoServerWebSocketManager } from "../ws/VideoServerWebSocketManager";
import { CastConfig, castConfig } from "./cast.config";
import { CastDiscovery } from "./cast-discovery";
import { CastSessionRunner } from "./cast-session";

const CAST_TOPIC = "cast";
/** An ended or failed session stays in the list this long, so the bar can say what happened before it goes. */
const FINISHED_KEEP_MS = 5000;

/** The Chromecasts on the network and the clips playing on them, one session per device. */
export class CastService {
    private readonly discovery = new CastDiscovery(() => this.publish());
    private readonly runners = new Map<string, CastSessionRunner>();
    private last = "";

    constructor(
        private readonly config: CastConfig,
        private readonly wsManager: VideoServerWebSocketManager
    ) {}

    start() {
        this.discovery.start();
    }

    stop() {
        this.discovery.stop();
        this.runners.forEach((runner) => runner.release());
    }

    getState(): CastState {
        return {
            configured: this.config.baseUrl !== undefined,
            devices: this.discovery.list().map(({ id, name, model }) => ({ id, name, model })),
            sessions: [...this.runners.values()].map((runner) => runner.session),
        };
    }

    subscribe(socket: WebSocket): CastState {
        this.wsManager.joinTopic(socket, CAST_TOPIC);
        return this.getState();
    }

    /** Starts the clip on each device. A device that has a session gets the new clip in its place. */
    startOn(clipId: string, deviceIds: string[], positionSec = 0): CastState {
        const baseUrl = this.config.baseUrl;
        if (!baseUrl) {
            throw new AppErrorV2({
                statusCode: 400,
                code: ErrorCodes.SERVICE_NOT_CONFIGURED,
                message: "Casting is not set up: VID_PUBLIC_BASE_URL is missing",
            });
        }
        const clip = homeVideoService.get(clipId);
        if (!clip) {
            throw new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "There is no such clip" });
        }
        const devices = deviceIds.map((id) => {
            const device = this.discovery.get(id);
            if (!device) {
                throw new AppErrorV2({
                    statusCode: 404,
                    code: ErrorCodes.NOT_FOUND,
                    message: "There is no such Chromecast on the network",
                });
            }
            return device;
        });
        const { exp, sig } = signStreamQuery(clipId);
        const url = `${baseUrl}/api/home-videos/stream/${clipId}?exp=${exp}&sig=${sig}`;
        const title = clip.title || clip.file;
        for (const device of devices) {
            this.runners.get(device.id)?.release();
            const runner = new CastSessionRunner({ device, clipId, title, url, positionSec }, () => this.onRunnerChange(device.id, runner));
            this.runners.set(device.id, runner);
            AppLogger.info(undefined, { message: `[Cast] ${clip.file} on "${device.name}" from ${Math.round(positionSec)} s` });
            runner.connect();
        }
        this.publish();
        return this.getState();
    }

    play(deviceId: string): CastState {
        this.runner(deviceId).play();
        return this.getState();
    }

    pause(deviceId: string): CastState {
        this.runner(deviceId).pause();
        return this.getState();
    }

    seek(deviceId: string, positionSec: number): CastState {
        this.runner(deviceId).seek(positionSec);
        return this.getState();
    }

    stopSession(deviceId: string): CastState {
        this.runner(deviceId).stop();
        return this.getState();
    }

    private runner(deviceId: string): CastSessionRunner {
        const runner = this.runners.get(deviceId);
        if (!runner || runner.finished) {
            throw new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "Nothing is cast to that Chromecast" });
        }
        return runner;
    }

    private onRunnerChange(deviceId: string, runner: CastSessionRunner) {
        // A session that was replaced does not report any more.
        if (this.runners.get(deviceId) !== runner) {
            return;
        }
        if (runner.finished) {
            setTimeout(() => {
                if (this.runners.get(deviceId) === runner) {
                    this.runners.delete(deviceId);
                    this.publish();
                }
            }, FINISHED_KEEP_MS);
        }
        this.publish();
    }

    /** Pushes the state when it differs from the last push. */
    private publish() {
        const state = this.getState();
        const json = JSON.stringify({ ...state, sessions: state.sessions.map(({ updatedAt: _, ...rest }) => rest) });
        // The time of the reading alone is not a change worth a push.
        if (json === this.last) {
            return;
        }
        this.last = json;
        this.wsManager.broadcastToTopic(CAST_TOPIC, { action: "cast_state", success: true, payload: state });
    }
}

export const castService = new CastService(castConfig, VideoServerWebSocketManager.getInstance());
