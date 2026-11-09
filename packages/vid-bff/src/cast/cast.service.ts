import { CastState, HomeVideoClip } from "@vid/common";
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
/** After a stop the Chromecast needs a moment before it takes a new app. */
const RESTART_GAP_MS = 2000;
/** An ended or failed session stays in the list this long, so the bar can say what happened before it goes. */
const FINISHED_KEEP_MS = 5000;

/** What the TV shows: the title, else the date as d.M.yyyy, else the file name, as the app names a clip. */
const clipTitle = (clip: HomeVideoClip): string => {
    if (clip.title) {
        return clip.title;
    }
    if (clip.date) {
        const [year, month, day] = clip.date.split("-").map(Number);
        return `${day}.${month}.${year}`;
    }
    return clip.file;
};

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

    /** Asks the network which Chromecasts are there. New ones arrive as a pushed state. */
    refresh(): CastState {
        this.discovery.refresh();
        return this.getState();
    }

    subscribe(socket: WebSocket): CastState {
        this.wsManager.joinTopic(socket, CAST_TOPIC);
        return this.getState();
    }

    /** Starts the clip on each device. A device that has a session gets the new clip in its place. */
    startOn(clipId: string, deviceIds: string[], positionSec = 0, connectDelayMs = 0): CastState {
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
        const query = `${clipId}?exp=${exp}&sig=${sig}`;
        const url = `${baseUrl}/api/home-videos/stream/${query}`;
        const posterUrl = `${baseUrl}/api/home-videos/poster/${query}`;
        const title = clipTitle(clip);
        for (const device of devices) {
            this.runners.get(device.id)?.release();
            const runner = new CastSessionRunner({ device, clipId, title, url, posterUrl, positionSec }, () => this.onRunnerChange(device.id, runner));
            this.runners.set(device.id, runner);
            AppLogger.info(undefined, { message: `[Cast] ${clip.file} on "${device.name}" from ${Math.round(positionSec)} s` });
            runner.connect(connectDelayMs);
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

    /** Takes the cast down on the Chromecast and casts the same clip again from where it was. */
    restart(deviceId: string): CastState {
        const old = this.runner(deviceId);
        const { clipId } = old.session;
        const position = old.currentPositionSec;
        old.takeDown();
        return this.startOn(clipId, [deviceId], position, RESTART_GAP_MS);
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
