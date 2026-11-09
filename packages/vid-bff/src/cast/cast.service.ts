import { CastQueue, CastQueueRequest, CastState, editQueue, HomeVideoClip, nextIndex, QueueEditError } from "@vid/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { WebSocket } from "ws";
import { homeVideoService } from "../home-video/home-video.service";
import { signStreamQuery } from "../stream/signed-url";
import { VideoServerWebSocketManager } from "../ws/VideoServerWebSocketManager";
import { CastConfig, castConfig } from "./cast.config";
import { CastDiscovery } from "./cast-discovery";
import { CastQueueStore } from "./cast-queue";
import { CastSession } from "./cast-session";
import { FoundDevice } from "./cast-discovery";
import { ChromecastsService } from "./chromecasts.service";

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
        (device) => {
            this.joinRunning(device);
            this.chromecasts.watch(device);
        },
        (deviceId) => this.chromecasts.unwatch(deviceId)
    );
    /** Every Chromecast with what plays on it, whoever cast it. */
    readonly chromecasts = new ChromecastsService(this.wsManager, (contentId) => this.clipOfStream(contentId)?.id);
    private readonly sessions = new Map<string, CastSession>();
    private readonly queues = new CastQueueStore(this.config.queuesFile);
    /** Clips in a row that failed on a device, to stop a queue where none plays. */
    private readonly failures = new Map<string, number>();
    private last = "";

    constructor(
        private readonly config: CastConfig,
        private readonly wsManager: VideoServerWebSocketManager
    ) {}

    /** Loads the queues first: a device that is found joins the cast that is running and has to know its queue. */
    async start() {
        await this.queues.load();
        this.discovery.start();
    }

    async stop() {
        this.discovery.stop();
        this.chromecasts.stop();
        this.sessions.forEach((session) => session.release());
        await this.queues.flush();
    }

    getState(): CastState {
        return {
            configured: this.config.baseUrl !== undefined,
            devices: this.discovery.list().map(({ id, name, model }) => ({ id, name, model })),
            sessions: [...this.sessions.values()]
                .filter((session) => session.visible)
                .map(({ snapshot }) => ({
                    ...snapshot,
                    queue: this.queues.get(snapshot.deviceId) ?? { clipIds: [snapshot.clipId], index: 0, repeat: false },
                })),
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

    /** The queue a device plays, a copy that can be kept. */
    queueOf(deviceId: string): CastQueue | undefined {
        const queue = this.queues.get(deviceId);
        return queue && { ...queue, clipIds: [...queue.clipIds] };
    }

    /** Starts the clip on each device, as a queue of that one clip. A device that has a session gets the new clip in its place. */
    startOn(clipId: string, deviceIds: string[], positionSec = 0): CastState {
        this.requireClips([clipId]);
        const devices = deviceIds.map((id) => this.device(id));
        for (const device of devices) {
            this.queues.set(device.id, { clipIds: [clipId], index: 0, repeat: false });
            this.startQueued(device, positionSec);
        }
        this.publish();
        return this.getState();
    }

    /** Changes the queue of a device. `replace` starts the clips there, every other action needs a queue that plays. */
    editQueue(deviceId: string, request: CastQueueRequest): CastState {
        if (request.action === "replace") {
            this.requireClips(request.clipIds);
            const device = this.device(deviceId);
            // Keeps the repeat of the queue that is replaced.
            this.queues.set(deviceId, { clipIds: [...request.clipIds], index: 0, repeat: this.queues.get(deviceId)?.repeat ?? false });
            this.startQueued(device);
            this.publish();
            return this.getState();
        }
        const queue = this.queues.get(deviceId);
        if (!queue) {
            throw new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "Nothing is cast to that Chromecast" });
        }
        const clipIds = "clipIds" in request ? request.clipIds : [];
        this.requireClips(clipIds);
        const missingField = this.missingField(request);
        if (missingField) {
            throw new AppErrorV2({
                statusCode: 400,
                code: ErrorCodes.VALIDATION,
                message: `The ${request.action} action needs ${missingField}`,
            });
        }
        let playChanged: boolean;
        try {
            ({ playChanged } = editQueue(queue, request));
        } catch (error) {
            if (error instanceof QueueEditError) {
                throw new AppErrorV2({ statusCode: 400, code: ErrorCodes.VALIDATION, message: error.message });
            }
            throw error;
        }
        this.queues.set(deviceId, queue);
        if (playChanged) {
            if (queue.clipIds.length === 0) {
                this.sessions.get(deviceId)?.stop();
            } else {
                this.startQueued(this.device(deviceId));
            }
        }
        this.publish();
        return this.getState();
    }

    /** Skips to the next clip of the queue, or to the first when it repeats. At the end of one that does not, it stops. */
    next(deviceId: string): CastState {
        this.session(deviceId);
        const queue = this.queues.get(deviceId);
        const index = queue && nextIndex(queue);
        if (!queue || index === undefined) {
            return this.stopSession(deviceId);
        }
        queue.index = index;
        this.queues.set(deviceId, queue);
        this.startQueued(this.device(deviceId));
        this.publish();
        return this.getState();
    }

    private missingField(request: CastQueueRequest): string | undefined {
        switch (request.action) {
            case "next":
            case "append":
                return request.clipIds ? undefined : "clipIds";
            case "remove":
            case "jump":
                return request.index === undefined ? "index" : undefined;
            case "move":
                return request.from === undefined || request.to === undefined ? "from and to" : undefined;
            case "repeat":
                return request.repeat === undefined ? "repeat" : undefined;
            default:
                return undefined;
        }
    }

    private requireClips(clipIds: string[]) {
        if (clipIds.some((id) => !homeVideoService.get(id))) {
            throw new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "There is no such clip" });
        }
    }

    private device(deviceId: string): FoundDevice {
        const device = this.discovery.get(deviceId);
        if (!device) {
            throw new AppErrorV2({
                statusCode: 404,
                code: ErrorCodes.NOT_FOUND,
                message: "There is no such Chromecast on the network",
            });
        }
        return device;
    }

    /**
     * Plays the clip the queue is at on the device, in the place of what plays there. A clip that is no longer in the library is
     * skipped. False, and the queue is gone, when nothing in it can play.
     */
    private startQueued(device: FoundDevice, positionSec = 0, connectDelayMs = 0): boolean {
        const queue = this.queues.get(device.id);
        const baseUrl = this.config.baseUrl;
        if (!baseUrl) {
            throw new AppErrorV2({
                statusCode: 400,
                code: ErrorCodes.SERVICE_NOT_CONFIGURED,
                message: "Casting is not set up: VID_PUBLIC_BASE_URL is missing",
            });
        }
        if (!queue) {
            return false;
        }
        for (let tried = 0; tried < queue.clipIds.length; tried++) {
            const clip = homeVideoService.get(queue.clipIds[queue.index]);
            if (clip) {
                this.queues.set(device.id, queue);
                this.startClip(device, baseUrl, clip, tried === 0 ? positionSec : 0, connectDelayMs);
                return true;
            }
            const index = nextIndex(queue);
            if (index === undefined) {
                break;
            }
            queue.index = index;
        }
        this.queues.delete(device.id);
        return false;
    }

    private startClip(device: FoundDevice, baseUrl: string, clip: HomeVideoClip, positionSec: number, connectDelayMs: number) {
        const { exp, sig } = signStreamQuery(clip.id);
        const query = `${clip.id}?exp=${exp}&sig=${sig}`;
        const url = `${baseUrl}/api/home-videos/stream/${query}`;
        const posterUrl = `${baseUrl}/api/home-videos/poster/${query}`;
        this.sessions.get(device.id)?.release();
        const session = new CastSession(
            device,
            { kind: "load", clipId: clip.id, title: clipTitle(clip), url, posterUrl, positionSec },
            () => this.onSessionChange(device.id, session)
        );
        this.sessions.set(device.id, session);
        AppLogger.info(undefined, { message: `[Cast] ${clip.file} on "${device.name}" from ${Math.round(positionSec)} s` });
        session.connect(connectDelayMs);
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

    setRate(deviceId: string, rate: number): CastState {
        this.session(deviceId).setRate(rate);
        return this.getState();
    }

    /** Takes the cast down on the Chromecast and casts the same clip again from where it was. */
    restart(deviceId: string): CastState {
        const old = this.session(deviceId);
        const device = this.device(deviceId);
        const position = old.currentPositionSec;
        old.takeDown();
        // The queue stays, so the clip that was cast goes on from where it was.
        this.startQueued(device, position, RESTART_GAP_MS);
        this.publish();
        return this.getState();
    }

    stopSession(deviceId: string): CastState {
        const session = this.session(deviceId);
        this.queues.delete(deviceId);
        session.stop();
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
        const session = new CastSession(
            device,
            {
                kind: "join",
                accept: (contentId) => {
                    const clip = this.clipOfStream(contentId);
                    if (clip) {
                        const queue = this.queues.get(device.id);
                        // The queue from before the restart is kept when it is at the clip that plays.
                        if (queue?.clipIds[queue.index] !== clip.id) {
                            this.queues.set(device.id, { clipIds: [clip.id], index: 0, repeat: false });
                        }
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

    /** The clip when the address is a stream link of ours. */
    private clipOfStream(contentId: string): HomeVideoClip | undefined {
        const streamPrefix = `${this.config.baseUrl}/api/home-videos/stream/`;
        return this.config.baseUrl && contentId.startsWith(streamPrefix)
            ? homeVideoService.get(contentId.slice(streamPrefix.length).split("?")[0])
            : undefined;
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
            this.queues.delete(deviceId);
            return;
        }
        if (session.snapshot.state === "PLAYING") {
            this.failures.delete(deviceId);
        }
        if (session.finished && this.advance(deviceId, session)) {
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

    /**
     * After a clip ended or failed, goes on to the next of the queue. False when it does not: the clip was stopped, or was the last,
     * or every clip of the queue failed in a row. The queue is gone then.
     */
    private advance(deviceId: string, session: CastSession): boolean {
        const queue = this.queues.get(deviceId);
        const failed = session.snapshot.state === "FAILED";
        const device = this.discovery.get(deviceId);
        if (queue && device && (failed || session.endedNaturally)) {
            const failures = failed ? (this.failures.get(deviceId) ?? 0) + 1 : 0;
            const index = nextIndex(queue);
            if (index !== undefined && failures < queue.clipIds.length) {
                this.failures.set(deviceId, failures);
                queue.index = index;
                if (this.startQueued(device)) {
                    this.publish();
                    return true;
                }
            }
        }
        this.queues.delete(deviceId);
        this.failures.delete(deviceId);
        return false;
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
