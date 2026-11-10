import {
    CastGroup,
    CastGroupRun,
    CastQueue,
    CastQueueRequest,
    CastSessionSnapshot,
    CastState,
    editQueue,
    HomeVideoClip,
    nextIndex,
    QueueEditError,
} from "@vid/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { WebSocket } from "ws";
import { homeVideoService } from "../home-video/home-video.service";
import { signStreamQuery } from "../stream/signed-url";
import { VideoServerWebSocketManager } from "../ws/VideoServerWebSocketManager";
import { CastConfig, castConfig } from "./cast.config";
import { CastDiscovery } from "./cast-discovery";
import { CastQueueStore } from "./cast-queue";
import { castGroupService } from "./cast-group.service";
import { CastGroupSession, GroupOutcome } from "./cast-group-session";
import { CastSession } from "./cast-session";
import { FoundDevice } from "./cast-discovery";
import { ChromecastMonitor } from "./chromecast-monitor";

const CAST_TOPIC = "cast";
/** After a stop the Chromecast needs a moment before it takes a new app. */
const RESTART_GAP_MS = 2000;
/** An ended or failed session stays in the list this long, so the bar can say what happened before it goes. */
const FINISHED_KEEP_MS = 5000;
/** After the last cast ended, a TV that the cast woke stays on this long, so that the next cast or a look at the TV can follow. */
const POWER_OFF_DELAY_MS = 60000;
/** The app in front is read this long after the cast ended, when the receiver has let go. */
const POWER_OFF_BASELINE_MS = 10000;

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

/**
 * VID's own casting: discovers the Chromecasts, runs one CastSession and queue per device for clips cast from this app,
 * and switches a TV on and off around a cast. Owns `monitor`, which covers casts made by other apps.
 */
export class CastService {
    private readonly discovery = new CastDiscovery(
        () => this.publish(),
        (device) => {
            this.joinRunning(device);
            void this.monitor.watch(device);
        },
        (deviceId) => this.monitor.unwatch(deviceId)
    );
    /** Every Chromecast with what plays on it, whoever cast it. */
    readonly monitor = new ChromecastMonitor(this.wsManager, (contentId) => this.clipOfStream(contentId)?.id);
    private readonly sessions = new Map<string, CastSession>();
    private readonly queues = new CastQueueStore(this.config.queuesFile);
    /** Clips in a row that failed on a device, to stop a queue where none plays. */
    private readonly failures = new Map<string, number>();
    /** Per device that has a cast going: whether the cast woke it from standby. Only such a TV is switched off afterwards. */
    private readonly wokenByCast = new Map<string, boolean>();
    /** The apps that were in front on such a device while the cast played and after it: any other app was started by someone. */
    private readonly castActivities = new Map<string, Set<string>>();
    /** Sessions whose app in front has been read. */
    private readonly sampled = new WeakSet<CastSession>();
    /** The groups that play, by group id. */
    private readonly groupSessions = new Map<string, CastGroupSession>();
    private readonly powerOffTimers = new Map<string, NodeJS.Timeout>();
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
        this.monitor.stop();
        this.groupSessions.forEach((group) => group.release());
        this.sessions.forEach((session) => session.release());
        this.powerOffTimers.forEach(clearTimeout);
        this.powerOffTimers.clear();
        await this.queues.flush();
    }

    getState(): CastState {
        return {
            configured: this.config.baseUrl !== undefined,
            devices: this.discovery.list().map(({ id, name, model }) => ({ id, name, model })),
            sessions: [
                ...[...this.sessions.values()]
                    .filter((session) => session.visible && !this.inGroupRun(session))
                    .map(({ snapshot }) => ({
                        ...snapshot,
                        queue: this.queues.get(snapshot.deviceId) ?? { clipIds: [snapshot.clipId], index: 0, repeat: false },
                    })),
                ...[...this.groupSessions.values()].map((run) => this.groupRow(run)),
            ],
        };
    }

    /** True for the session of a member while its group plays, or just after: the group's row stands for it. */
    private inGroupRun(session: CastSession): boolean {
        return [...this.groupSessions.values()].some((run) => run.holds(session));
    }

    /** A group of Chromecasts as one session: the member furthest behind, under the id of the group. */
    private groupRow(run: CastGroupSession): CastSessionSnapshot {
        const snapshot = run.referenceSession.snapshot;
        const phase = run.phaseNow;
        return {
            ...snapshot,
            deviceId: run.groupId,
            deviceName: castGroupService.get(run.groupId)?.name ?? "Group",
            // Until every member plays, the position of the first to start means little.
            state: phase === "LOADING" ? "LOADING" : phase === "STARTING" ? "BUFFERING" : snapshot.state,
            queue: this.queues.get(run.groupId) ?? { clipIds: [run.clipId], index: 0, repeat: false },
            members: run.snapshot.members,
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
            this.leaveGroupOf(device.id);
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
            this.requireTarget(deviceId);
            if (!castGroupService.get(deviceId)) {
                this.leaveGroupOf(deviceId);
            }
            // Keeps the repeat of the queue that is replaced.
            this.queues.set(deviceId, { clipIds: [...request.clipIds], index: 0, repeat: this.queues.get(deviceId)?.repeat ?? false });
            this.playQueue(deviceId);
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
                this.stopPlayer(deviceId);
            } else {
                this.playQueue(deviceId);
            }
        }
        this.publish();
        return this.getState();
    }

    /** Skips to the next clip of the queue, or to the first when it repeats. At the end of one that does not, it stops. */
    next(deviceId: string): CastState {
        this.playerSession(deviceId);
        const queue = this.queues.get(deviceId);
        const index = queue && nextIndex(queue);
        if (!queue || index === undefined) {
            return this.stopSession(deviceId);
        }
        queue.index = index;
        this.queues.set(deviceId, queue);
        this.playQueue(deviceId);
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

    /** A group or a device that is on the network, else not found. */
    private requireTarget(id: string) {
        if (!castGroupService.get(id)) {
            this.device(id);
        }
    }

    /** Plays the queue of the id, which is a group or a device, from its clip. */
    private playQueue(id: string, positionSec = 0) {
        const group = castGroupService.get(id);
        if (group) {
            this.startGroupQueued(group, positionSec);
        } else {
            this.startQueued(this.device(id), positionSec);
        }
    }

    private stopPlayer(id: string) {
        if (castGroupService.get(id)) {
            this.stopGroup(id);
        } else {
            this.sessions.get(id)?.stop();
        }
    }

    /** A group of the id that plays; a clip that has just ended there is not playing any more. */
    private runningGroup(id: string): CastGroupSession | undefined {
        const run = this.groupSessions.get(id);
        return run && !run.ended ? run : undefined;
    }

    /** True when the group plays: it cannot be edited or deleted then. */
    isGroupRunning(groupId: string): boolean {
        return this.runningGroup(groupId) !== undefined;
    }

    /** Throws when the group plays: it is edited or deleted after it is stopped. */
    requireGroupIdle(groupId: string) {
        if (this.isGroupRunning(groupId)) {
            throw new AppErrorV2({ statusCode: 409, code: ErrorCodes.INVALID_STATE, message: "The group plays, stop it first" });
        }
    }

    /** A cast of one device that is a member of a group that plays ends that group: the device cannot do both. */
    private leaveGroupOf(deviceId: string, exceptGroupId?: string) {
        for (const [groupId, run] of this.groupSessions) {
            if (groupId !== exceptGroupId && !run.ended && run.snapshot.members.some((member) => member.deviceId === deviceId)) {
                AppLogger.info(undefined, { message: `[CastGroup] ${groupId} stops: a member is cast to on its own` });
                this.stopGroup(groupId);
            }
        }
    }

    /**
     * The clip the queue is at, moving the queue past clips that are no longer in the library. `skipped` is true when the first
     * clips had to be passed. Undefined when nothing in the queue can play.
     */
    private playableClip(queue: CastQueue): { clip: HomeVideoClip; skipped: boolean } | undefined {
        for (let tried = 0; tried < queue.clipIds.length; tried++) {
            const clip = homeVideoService.get(queue.clipIds[queue.index]);
            if (clip) {
                return { clip, skipped: tried > 0 };
            }
            const index = nextIndex(queue);
            if (index === undefined) {
                break;
            }
            queue.index = index;
        }
        return undefined;
    }

    private requireBaseUrl(): string {
        const baseUrl = this.config.baseUrl;
        if (!baseUrl) {
            throw new AppErrorV2({
                statusCode: 400,
                code: ErrorCodes.SERVICE_NOT_CONFIGURED,
                message: "Casting is not set up: VID_PUBLIC_BASE_URL is missing",
            });
        }
        return baseUrl;
    }

    /**
     * Plays the clip the queue is at on the device, in the place of what plays there. A clip that is no longer in the library is
     * skipped. False, and the queue is gone, when nothing in it can play.
     */
    private startQueued(device: FoundDevice, positionSec = 0, connectDelayMs = 0): boolean {
        const queue = this.queues.get(device.id);
        const baseUrl = this.requireBaseUrl();
        if (!queue) {
            return false;
        }
        const playable = this.playableClip(queue);
        if (playable) {
            this.queues.set(device.id, queue);
            this.startClip(device, baseUrl, playable.clip, playable.skipped ? 0 : positionSec, connectDelayMs);
            return true;
        }
        this.queues.delete(device.id);
        return false;
    }

    private startClip(
        device: FoundDevice,
        baseUrl: string,
        clip: HomeVideoClip,
        positionSec: number,
        connectDelayMs: number,
        autoplay = true
    ): CastSession {
        const { exp, sig } = signStreamQuery(clip.id);
        const query = `${clip.id}?exp=${exp}&sig=${sig}`;
        const url = `${baseUrl}/api/home-videos/stream/${query}`;
        const posterUrl = `${baseUrl}/api/home-videos/poster/${query}`;
        this.sessions.get(device.id)?.release();
        this.cancelPowerOff(device.id);
        // Read before the launch, which wakes the TV. The first clip of a run decides, the following ones find a TV that is on.
        if (!this.wokenByCast.has(device.id)) {
            this.wokenByCast.set(device.id, this.monitor.isStandBy(device.id));
            this.castActivities.set(device.id, new Set());
        }
        const session = new CastSession(
            device,
            { kind: "load", clipId: clip.id, title: clipTitle(clip), url, posterUrl, positionSec, autoplay },
            () => this.onSessionChange(device.id, session)
        );
        this.sessions.set(device.id, session);
        AppLogger.info(undefined, { message: `[Cast] ${clip.file} on "${device.name}" from ${Math.round(positionSec)} s` });
        session.connect(connectDelayMs);
        return session;
    }

    /**
     * Plays the clip on every device of the group, as a queue of that one clip. See `startGroupQueued`. A group that already plays
     * gets the clip in its place.
     */
    startGroup(groupId: string, clipId: string, positionSec = 0): CastGroupRun {
        if (!castGroupService.get(groupId)) {
            throw new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "There is no such group" });
        }
        this.requireClips([clipId]);
        this.queues.set(groupId, { clipIds: [clipId], index: 0, repeat: false });
        this.playQueue(groupId, positionSec);
        this.publish();
        return this.groupRun(groupId);
    }

    /**
     * Plays the clip the queue of the group is at on every device of the group: loaded paused and started together, then kept in
     * sync. A device of the group that cannot be found is left out; at least one must be there. What plays on the group is replaced.
     */
    private startGroupQueued(group: CastGroup, positionSec = 0): boolean {
        const queue = this.queues.get(group.id);
        const baseUrl = this.requireBaseUrl();
        if (!queue) {
            return false;
        }
        const devices = group.deviceIds.flatMap((id) => this.discovery.get(id) ?? []);
        if (devices.length === 0) {
            throw new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "No Chromecast of the group is on the network" });
        }
        const playable = this.playableClip(queue);
        if (!playable) {
            this.queues.delete(group.id);
            return false;
        }
        this.queues.set(group.id, queue);
        devices.forEach((device) => this.leaveGroupOf(device.id, group.id));
        this.groupSessions.get(group.id)?.release();
        const members = devices.map((device) => {
            // A member has no queue of its own, the group has it.
            this.queues.delete(device.id);
            return {
                deviceId: device.id,
                name: device.name,
                session: this.startClip(device, baseUrl, playable.clip, playable.skipped ? 0 : positionSec, 0, false),
            };
        });
        const run: CastGroupSession = new CastGroupSession(
            group.id,
            playable.clip.id,
            members,
            () => this.onGroupChange(run),
            (member) => this.sessions.get(member.deviceId) === member.session,
            (outcome) => this.onGroupFinished(run, outcome)
        );
        this.groupSessions.set(group.id, run);
        run.start();
        return true;
    }

    groupRun(groupId: string): CastGroupRun {
        const run = this.groupSessions.get(groupId);
        if (!run) {
            throw new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "That group does not play" });
        }
        return run.snapshot;
    }

    /** Stops the group's members and lets the group go, with its queue. Nothing happens when it does not play. */
    stopGroup(groupId: string) {
        const run = this.runningGroup(groupId);
        if (!run) {
            return;
        }
        this.queues.delete(groupId);
        this.failures.delete(groupId);
        run.release();
        for (const { deviceId } of run.snapshot.members) {
            const session = this.sessions.get(deviceId);
            if (session && run.holds(session) && !session.finished) {
                session.stop();
            }
        }
        this.forgetRunLater(run);
        this.publish();
    }

    /** The row of a run that is over stays a moment, as that of a single session does, then goes. */
    private forgetRunLater(run: CastGroupSession) {
        setTimeout(() => {
            if (this.groupSessions.get(run.groupId) === run) {
                this.groupSessions.delete(run.groupId);
                this.publish();
            }
        }, FINISHED_KEEP_MS);
    }

    private onGroupChange(run: CastGroupSession) {
        if (this.groupSessions.get(run.groupId) !== run) {
            return;
        }
        // Playing together means the clip is good: the run of failures is broken.
        if (run.phaseNow === "SYNCING" || run.phaseNow === "PLAYING") {
            this.failures.delete(run.groupId);
        }
        this.publish();
    }

    /** After the clip of the group is over, goes on to the next of its queue, as a single device does, else lets the group go. */
    private onGroupFinished(run: CastGroupSession, outcome: GroupOutcome) {
        if (this.groupSessions.get(run.groupId) !== run) {
            return;
        }
        const { groupId } = run;
        const queue = this.queues.get(groupId);
        const group = castGroupService.get(groupId);
        if (queue && group && outcome !== "gone") {
            const failures = outcome === "failed" ? (this.failures.get(groupId) ?? 0) + 1 : 0;
            const index = nextIndex(queue);
            if (index !== undefined && failures < queue.clipIds.length) {
                this.failures.set(groupId, failures);
                queue.index = index;
                try {
                    if (this.startGroupQueued(group)) {
                        this.publish();
                        return;
                    }
                } catch (error) {
                    AppLogger.warn(undefined, { message: `[CastGroup] ${groupId} could not go on to the next clip`, error });
                }
            }
        }
        this.queues.delete(groupId);
        this.failures.delete(groupId);
        this.forgetRunLater(run);
        this.publish();
    }

    play(deviceId: string): CastState {
        const run = this.runningGroup(deviceId);
        if (run) {
            run.play();
        } else {
            this.session(deviceId).play();
        }
        return this.getState();
    }

    pause(deviceId: string): CastState {
        const run = this.runningGroup(deviceId);
        if (run) {
            run.pause();
        } else {
            this.session(deviceId).pause();
        }
        return this.getState();
    }

    seek(deviceId: string, positionSec: number): CastState {
        const run = this.runningGroup(deviceId);
        if (run) {
            run.seek(positionSec);
        } else {
            this.session(deviceId).seek(positionSec);
        }
        return this.getState();
    }

    setRate(deviceId: string, rate: number): CastState {
        const run = this.runningGroup(deviceId);
        if (run) {
            run.setRate(rate);
        } else {
            this.session(deviceId).setRate(rate);
        }
        return this.getState();
    }

    /** Takes the cast down on the Chromecast and casts the same clip again from where it was. */
    restart(deviceId: string): CastState {
        if (this.runningGroup(deviceId)) {
            throw new AppErrorV2({
                statusCode: 400,
                code: ErrorCodes.INVALID_STATE,
                message: "A group cannot be restarted, play the clip again",
            });
        }
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
        if (this.runningGroup(deviceId)) {
            this.stopGroup(deviceId);
            return this.getState();
        }
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

    /** The session that stands for the player of the id: that of a device, or for a group the member furthest behind. */
    private playerSession(id: string): CastSession {
        const run = this.runningGroup(id);
        return run ? run.referenceSession : this.session(id);
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
            if (this.wokenByCast.get(deviceId) === true && !this.sampled.has(session)) {
                this.sampled.add(session);
                void this.noteActivity(deviceId);
            }
        }
        if (session.finished && this.advance(deviceId, session)) {
            return;
        }
        if (session.finished) {
            this.schedulePowerOff(deviceId);
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

    /** The run of casts on the device is over: a TV that the cast woke is switched off after a while, any other is left alone. */
    private schedulePowerOff(deviceId: string) {
        this.cancelPowerOff(deviceId);
        if (this.wokenByCast.get(deviceId) !== true) {
            this.wokenByCast.delete(deviceId);
            this.castActivities.delete(deviceId);
            return;
        }
        const timer = setTimeout(() => void this.readBaseline(deviceId, timer), POWER_OFF_BASELINE_MS);
        this.powerOffTimers.set(deviceId, timer);
    }

    /** Remembers the app in front while a clip plays, which is the Cast receiver. */
    private async noteActivity(deviceId: string) {
        const activity = await this.monitor.currentActivity(deviceId);
        if (activity) {
            this.castActivities.get(deviceId)?.add(activity);
        }
    }

    private async readBaseline(deviceId: string, timer: NodeJS.Timeout) {
        const activity = await this.monitor.currentActivity(deviceId);
        // A new cast cancelled the power-off while the TV was read.
        if (this.powerOffTimers.get(deviceId) !== timer) {
            return;
        }
        if (activity) {
            this.castActivities.get(deviceId)?.add(activity);
        }
        const known = new Set(this.castActivities.get(deviceId));
        this.powerOffTimers.set(
            deviceId,
            setTimeout(() => void this.powerOff(deviceId, known), POWER_OFF_DELAY_MS - POWER_OFF_BASELINE_MS)
        );
    }

    private cancelPowerOff(deviceId: string) {
        clearTimeout(this.powerOffTimers.get(deviceId));
        this.powerOffTimers.delete(deviceId);
    }

    private async powerOff(deviceId: string, known: ReadonlySet<string>) {
        this.powerOffTimers.delete(deviceId);
        this.wokenByCast.delete(deviceId);
        this.castActivities.delete(deviceId);
        try {
            if (await this.monitor.standByIfIdle(deviceId, known)) {
                AppLogger.info(undefined, {
                    message: `[Cast] Switched off "${this.discovery.get(deviceId)?.name ?? deviceId}" after the cast`,
                });
            }
        } catch (error) {
            AppLogger.warn(undefined, { message: `[Cast] Could not switch off "${deviceId}" after the cast`, error });
        }
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
