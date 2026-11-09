import { CastState, HomeVideoClip } from "@vid/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { WebSocket } from "ws";
import { homeVideoService } from "../home-video/home-video.service";
import { signStreamQuery } from "../stream/signed-url";
import { VideoServerWebSocketManager } from "../ws/VideoServerWebSocketManager";
import { CastConfig, castConfig } from "./cast.config";
import { CastDiscovery } from "./cast-discovery";
import { CastSession } from "./cast-session";
import { FoundDevice } from "./cast-discovery";

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
    private readonly discovery = new CastDiscovery(
        () => this.publish(),
        (device) => this.joinRunning(device)
    );
    private readonly sessions = new Map<string, CastSession>();
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
        this.sessions.forEach((session) => session.release());
    }

    getState(): CastState {
        return {
            configured: this.config.baseUrl !== undefined,
            devices: this.discovery.list().map(({ id, name, model }) => ({ id, name, model })),
            sessions: [...this.sessions.values()].filter((session) => session.visible).map((session) => session.snapshot),
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
            this.sessions.get(device.id)?.release();
            const session = new CastSession(device, { kind: "load", clipId, title, url, posterUrl, positionSec }, () =>
                this.onSessionChange(device.id, session)
            );
            this.sessions.set(device.id, session);
            AppLogger.info(undefined, { message: `[Cast] ${clip.file} on "${device.name}" from ${Math.round(positionSec)} s` });
            session.connect(connectDelayMs);
        }
        this.publish();
        return this.getState();
    }

    play(deviceId: string): CastState {
        this.session(deviceId).play();
        return this.getState();
    }

    pause(deviceId: string): CastState {
        this.session(deviceId).pause();
        return this.getState();
    }

    seek(deviceId: string, positionSec: number): CastState {
        this.session(deviceId).seek(positionSec);
        return this.getState();
    }

    /** Takes the cast down on the Chromecast and casts the same clip again from where it was. */
    restart(deviceId: string): CastState {
        const old = this.session(deviceId);
        const { clipId } = old.snapshot;
        const position = old.currentPositionSec;
        old.takeDown();
        return this.startOn(clipId, [deviceId], position, RESTART_GAP_MS);
    }

    stopSession(deviceId: string): CastState {
        this.session(deviceId).stop();
        return this.getState();
    }

    /**
     * A cast that outlived the server plays on, but the server has forgotten it. When a device shows up, look at what it plays
     * and join a clip of ours as one more sender. A device with nothing playing is left alone.
     */
    private joinRunning(device: FoundDevice) {
        const baseUrl = this.config.baseUrl;
        if (!baseUrl || this.sessions.has(device.id)) {
            return;
        }
        const streamPrefix = `${baseUrl}/api/home-videos/stream/`;
        const session = new CastSession(
            device,
            {
                kind: "join",
                accept: (contentId) => {
                    if (!contentId.startsWith(streamPrefix)) {
                        return undefined;
                    }
                    const clip = homeVideoService.get(contentId.slice(streamPrefix.length).split("?")[0]);
                    if (clip) {
                        AppLogger.info(undefined, { message: `[Cast] Joined ${clip.file} playing on "${device.name}"` });
                    }
                    return clip && { clipId: clip.id, title: clipTitle(clip) };
                },
            },
            () => this.onSessionChange(device.id, session)
        );
        this.sessions.set(device.id, session);
        session.connect();
    }

    private session(deviceId: string): CastSession {
        const session = this.sessions.get(deviceId);
        if (!session || session.finished) {
            throw new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "Nothing is cast to that Chromecast" });
        }
        return session;
    }

    private onSessionChange(deviceId: string, session: CastSession) {
        // A session that was replaced does not report any more.
        if (this.sessions.get(deviceId) !== session) {
            return;
        }
        if (!session.visible) {
            // A joining session that found nothing of ours.
            this.sessions.delete(deviceId);
            return;
        }
        if (session.finished) {
            setTimeout(() => {
                if (this.sessions.get(deviceId) === session) {
                    this.sessions.delete(deviceId);
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
