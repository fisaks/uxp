import { CastPlayerState, CastSessionSnapshot } from "@vid/common";
import { AppLogger } from "@uxp/bff-common";
import { Channel, Client } from "castv2";
import { FoundDevice } from "./cast-discovery";

const CAST_PORT = 8009;
const SENDER = "sender-0";
const RECEIVER = "receiver-0";
const NS_CONNECTION = "urn:x-cast:com.google.cast.tp.connection";
const NS_HEARTBEAT = "urn:x-cast:com.google.cast.tp.heartbeat";
const NS_RECEIVER = "urn:x-cast:com.google.cast.receiver";
const NS_MEDIA = "urn:x-cast:com.google.cast.media";
/** The Default Media Receiver: plays a URL, has no UI of its own. */
const DEFAULT_MEDIA_RECEIVER = "CC1AD845";

const HEARTBEAT_INTERVAL_MS = 5000;
// No answer to the pings for this long means the connection is dead, as when the device loses power.
const HEARTBEAT_TIMEOUT_MS = 15000;
// Status pushes are not reliable on their own, so the position is also asked for now and then.
const STATUS_POLL_MS = 5000;
// From the connection until the media is loaded and answers: a device that never does has failed.
const LOAD_TIMEOUT_MS = 20000;

/** What the session knows: the snapshot without the queue, which the service adds. */
export type SessionSnapshot = Omit<CastSessionSnapshot, "queue">;

/** The part of a media status that is used. */
type CastMediaStatus = {
    mediaSessionId?: number;
    playerState?: string;
    idleReason?: string;
    currentTime?: number;
    playbackRate?: number;
    media?: { contentId?: string; duration?: number };
};

/** Plays a clip on the device: launches the receiver and loads the URL. */
export type CastLoad = {
    kind: "load";
    clipId: string;
    title: string;
    /** Where the Chromecast fetches the video, with the signature in the query. */
    url: string;
    /** The poster frame, fetched the same way. Undefined when the video has none. */
    posterUrl?: string;
    positionSec: number;
    /** False loads the clip paused at `positionSec`, for a group that starts all its members together. Default true. */
    autoplay?: boolean;
};

/**
 * Joins what the device already plays as one more sender, without starting anything: for a cast that outlived the server.
 * `accept` gets the address of the playing media and returns the clip if it is one of ours, else undefined and the session is
 * dropped.
 */
export type CastJoin = {
    kind: "join";
    accept: (contentId: string) => { clipId: string; title: string } | undefined;
};

/**
 * One clip on one Chromecast. It has its own connection: it launches the Default Media Receiver, loads the URL and follows
 * the media status. It ends when the receiver stops, the clip finishes, or the connection is lost.
 */
export class CastSession {
    private latest: SessionSnapshot;
    private client?: Client;
    private receiver?: Channel;
    private media?: Channel;
    private timers: NodeJS.Timeout[] = [];
    private loadTimer?: NodeJS.Timeout;
    private lastPong = Date.now();
    private requestId = 100;
    private appSessionId?: string;
    private mediaSessionId?: number;
    private loaded = false;
    private closed = false;
    private rejected = false;
    private playedToEnd = false;

    constructor(
        private readonly device: FoundDevice,
        private readonly source: CastLoad | CastJoin,
        private readonly onChange: () => void
    ) {
        this.latest = {
            deviceId: device.id,
            deviceName: device.name,
            clipId: source.kind === "load" ? source.clipId : "",
            title: source.kind === "load" ? source.title : "",
            state: "LOADING",
            positionSec: source.kind === "load" ? source.positionSec : 0,
            durationSec: 0,
            updatedAt: Date.now(),
        };
    }

    get snapshot(): SessionSnapshot {
        return this.latest;
    }

    /** False while a joining session has not found one of our clips, and for good when it did not. */
    get visible(): boolean {
        return !this.rejected && (this.source.kind === "load" || this.latest.clipId !== "");
    }

    /** True when the clip played to its end, as against a stop or a failure. */
    get endedNaturally(): boolean {
        return this.playedToEnd;
    }

    get finished(): boolean {
        return this.latest.state === "ENDED" || this.latest.state === "FAILED";
    }

    /** Where the clip is now: the position of the last status, moved on by the time since then while it plays. */
    get currentPositionSec(): number {
        const { state, positionSec, durationSec, playbackRate, updatedAt } = this.latest;
        const position = positionSec + (state === "PLAYING" ? ((Date.now() - updatedAt) / 1000) * (playbackRate ?? 1) : 0);
        return durationSec > 0 ? Math.min(position, durationSec) : position;
    }

    /** Connects at once, or after the delay, which gives a Chromecast that was just stopped time to let go of its app. */
    connect(delayMs = 0) {
        if (delayMs > 0) {
            this.timers.push(setTimeout(() => this.connect(), delayMs));
            return;
        }
        const client = new Client();
        this.client = client;
        client.on("error", (error) => this.fail("Could not reach the Chromecast", error));
        client.on("close", () => this.fail("The connection to the Chromecast closed"));
        client.connect({ host: this.device.host, port: CAST_PORT }, () => this.open(client));
        this.loadTimer = setTimeout(() => this.fail("The Chromecast did not start the video"), LOAD_TIMEOUT_MS);
    }

    play() {
        this.mediaCommand("PLAY");
    }

    pause() {
        this.mediaCommand("PAUSE");
    }

    seek(positionSec: number) {
        this.mediaCommand("SEEK", { currentTime: positionSec });
        this.set({ positionSec });
    }

    /** Asks for the status now, for a group that follows the position closely. The answer arrives as a status. */
    requestStatus() {
        if (this.media) {
            this.send(this.media, { type: "GET_STATUS" });
        }
    }

    /** The receiver answers with a status that carries the new rate. */
    setRate(rate: number) {
        this.mediaCommand("SET_PLAYBACK_RATE", { playbackRate: rate });
    }

    /** Stops the app on the Chromecast, which returns it to its backdrop, and ends the session. */
    stop() {
        this.stopApp();
        this.end("ENDED");
    }

    /** Stops the app on the Chromecast and lets go, without ending the session: a new one takes its place. */
    takeDown() {
        this.stopApp();
        this.release();
    }

    private stopApp() {
        if (this.receiver && this.appSessionId) {
            this.send(this.receiver, { type: "STOP", sessionId: this.appSessionId });
        }
    }

    /** Lets go of the Chromecast without stopping what plays: a new session takes its place, or the server shuts down. */
    release() {
        this.closed = true;
        this.cleanup();
    }

    private open(client: Client) {
        const connection = client.createChannel(SENDER, RECEIVER, NS_CONNECTION, "JSON");
        const heartbeat = client.createChannel(SENDER, RECEIVER, NS_HEARTBEAT, "JSON");
        const receiver = client.createChannel(SENDER, RECEIVER, NS_RECEIVER, "JSON");
        this.receiver = receiver;
        connection.send({ type: "CONNECT" });
        heartbeat.on("message", (data) => {
            if (data?.type === "PONG") {
                this.lastPong = Date.now();
            }
        });
        receiver.on("message", (data) => {
            if (data?.type === "RECEIVER_STATUS") {
                this.onReceiverStatus(data.status?.applications ?? []);
            }
        });
        this.timers.push(
            setInterval(() => {
                if (Date.now() - this.lastPong > HEARTBEAT_TIMEOUT_MS) {
                    this.fail("The Chromecast stopped answering");
                    return;
                }
                this.send(heartbeat, { type: "PING" });
            }, HEARTBEAT_INTERVAL_MS),
            setInterval(() => this.media && this.send(this.media, { type: "GET_STATUS" }), STATUS_POLL_MS)
        );
        if (this.source.kind === "join") {
            // Only asks what runs: a launch would start the receiver, and wake a TV, that has nothing to show.
            this.send(receiver, { type: "GET_STATUS" });
            return;
        }
        // Launching an app that already runs joins it, and another app is replaced: what is cast wins.
        this.send(receiver, { type: "LAUNCH", appId: DEFAULT_MEDIA_RECEIVER });
    }

    private onReceiverStatus(applications: { appId?: string; transportId?: string; sessionId?: string }[]) {
        const app = applications.find((a) => a.appId === DEFAULT_MEDIA_RECEIVER && a.transportId);
        if (!app) {
            // Something else took the Chromecast, or it was stopped from elsewhere. Before the launch has answered there is no app yet.
            if (this.source.kind === "join" && !this.loaded) {
                this.reject();
            } else if (this.loaded) {
                this.end("ENDED");
            }
            return;
        }
        this.appSessionId = app.sessionId;
        if (!this.media && this.client && app.transportId) {
            this.join(this.client, app.transportId);
        }
    }

    private join(client: Client, transportId: string) {
        const connection = client.createChannel(SENDER, transportId, NS_CONNECTION, "JSON");
        const media = client.createChannel(SENDER, transportId, NS_MEDIA, "JSON");
        this.media = media;
        connection.send({ type: "CONNECT" });
        media.on("message", (data) => this.onMediaMessage(data));
        const { source } = this;
        if (source.kind === "join") {
            this.send(media, { type: "GET_STATUS" });
            return;
        }
        this.send(media, {
            type: "LOAD",
            autoplay: source.autoplay ?? true,
            currentTime: source.positionSec,
            media: {
                contentId: source.url,
                contentType: "video/mp4",
                streamType: "BUFFERED",
                metadata: { metadataType: 0, title: source.title, images: source.posterUrl ? [{ url: source.posterUrl }] : [] },
            },
        });
    }

    private onMediaMessage(data: { type?: string; status?: CastMediaStatus[]; reason?: string }) {
        if (data?.type === "LOAD_FAILED" || data?.type === "INVALID_REQUEST" || data?.type === "INVALID_PLAYER_STATE") {
            this.fail(`The Chromecast could not play the video (${data.reason ?? data.type})`);
            return;
        }
        if (data?.type !== "MEDIA_STATUS") {
            return;
        }
        const status = data.status?.[0];
        if (!status) {
            return;
        }
        this.mediaSessionId = status.mediaSessionId ?? this.mediaSessionId;
        const state = status.playerState as CastPlayerState | undefined;
        if (this.source.kind === "join" && !this.loaded && !this.matchPlaying(status, state)) {
            return;
        }
        if (state === "IDLE") {
            // Idle before anything played is the receiver getting ready, not the end.
            if (this.loaded) {
                this.playedToEnd = status.idleReason === "FINISHED";
                this.end(
                    status.idleReason === "ERROR" ? "FAILED" : "ENDED",
                    status.idleReason === "ERROR" ? "The Chromecast could not play the video" : undefined
                );
            }
            return;
        }
        if (!state) {
            return;
        }
        this.loaded = true;
        clearTimeout(this.loadTimer);
        this.set({
            state,
            positionSec: status.currentTime ?? this.latest.positionSec,
            playbackRate: status.playbackRate ?? 1,
            durationSec: Math.floor(status.media?.duration ?? this.latest.durationSec),
        });
    }

    /** For a joining session: follows the playing clip if it is ours, else lets go. False means not (yet) following. */
    private matchPlaying(status: CastMediaStatus, state: string | undefined): boolean {
        if (this.source.kind !== "join") {
            return true;
        }
        if (!state || state === "IDLE") {
            this.reject();
            return false;
        }
        const contentId = status.media?.contentId;
        if (!contentId) {
            // The status without the media is not enough to tell; the next one has it, else the load timeout gives up.
            return false;
        }
        const clip = this.source.accept(contentId);
        if (!clip) {
            this.reject();
            return false;
        }
        this.latest = { ...this.latest, ...clip };
        return true;
    }

    /** Lets go of the device: what plays there is not ours to show. */
    private reject() {
        this.rejected = true;
        this.release();
        this.onChange();
    }

    private mediaCommand(type: string, extra: object = {}) {
        if (!this.media || this.mediaSessionId === undefined) {
            return;
        }
        this.send(this.media, { type, mediaSessionId: this.mediaSessionId, ...extra });
    }

    private send(channel: Channel, message: object) {
        try {
            channel.send({ ...message, requestId: this.requestId++ });
        } catch (error) {
            this.fail("The Chromecast did not take the command", error);
        }
    }

    private fail(error: string, cause?: unknown) {
        if (this.finished || this.closed) {
            return;
        }
        if (this.source.kind === "join" && !this.loaded) {
            // Nothing was cast by us, so there is nothing to report as failed.
            this.reject();
            return;
        }
        AppLogger.warn(undefined, { message: `[Cast] ${this.device.name}: ${error}`, error: cause });
        this.end("FAILED", error);
    }

    private end(state: "ENDED" | "FAILED", error?: string) {
        if (this.finished) {
            return;
        }
        this.cleanup();
        this.set({ state, error });
    }

    private cleanup() {
        clearTimeout(this.loadTimer);
        this.timers.forEach((timer) => {
            clearInterval(timer);
            clearTimeout(timer);
        });
        this.timers = [];
        try {
            this.client?.close();
        } catch {
            // Already closed.
        }
    }

    private set(change: Partial<SessionSnapshot>) {
        this.latest = { ...this.latest, ...change, updatedAt: Date.now() };
        this.onChange();
    }
}
