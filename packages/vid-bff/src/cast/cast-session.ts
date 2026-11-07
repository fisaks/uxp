import { CastPlayerState, CastSession } from "@vid/common";
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

/** The part of a media status that is used. */
type CastMediaStatus = {
    mediaSessionId?: number;
    playerState?: string;
    idleReason?: string;
    currentTime?: number;
    media?: { duration?: number };
};

export type CastSessionStart = {
    device: FoundDevice;
    clipId: string;
    title: string;
    /** Where the Chromecast fetches the video, with the signature in the query. */
    url: string;
    positionSec: number;
};

/**
 * One clip on one Chromecast. It has its own connection: it launches the Default Media Receiver, loads the URL and follows
 * the media status. It ends when the receiver stops, the clip finishes, or the connection is lost.
 */
export class CastSessionRunner {
    private snapshot: CastSession;
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

    constructor(
        private readonly start: CastSessionStart,
        private readonly onChange: () => void
    ) {
        this.snapshot = {
            deviceId: start.device.id,
            deviceName: start.device.name,
            clipId: start.clipId,
            title: start.title,
            state: "LOADING",
            positionSec: start.positionSec,
            durationSec: 0,
            updatedAt: Date.now(),
        };
    }

    get session(): CastSession {
        return this.snapshot;
    }

    get finished(): boolean {
        return this.snapshot.state === "ENDED" || this.snapshot.state === "FAILED";
    }

    connect() {
        const client = new Client();
        this.client = client;
        client.on("error", (error) => this.fail("Could not reach the Chromecast", error));
        client.on("close", () => this.fail("The connection to the Chromecast closed"));
        client.connect({ host: this.start.device.host, port: CAST_PORT }, () => this.open(client));
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

    /** Stops the app on the Chromecast, which returns it to its backdrop, and ends the session. */
    stop() {
        if (this.receiver && this.appSessionId) {
            this.send(this.receiver, { type: "STOP", sessionId: this.appSessionId });
        }
        this.end("ENDED");
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
        // Launching an app that already runs joins it, and another app is replaced: what is cast wins.
        this.send(receiver, { type: "LAUNCH", appId: DEFAULT_MEDIA_RECEIVER });
    }

    private onReceiverStatus(applications: { appId?: string; transportId?: string; sessionId?: string }[]) {
        const app = applications.find((a) => a.appId === DEFAULT_MEDIA_RECEIVER && a.transportId);
        if (!app) {
            // Something else took the Chromecast, or it was stopped from elsewhere. Before the launch has answered there is no app yet.
            if (this.loaded) {
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
        this.send(media, {
            type: "LOAD",
            autoplay: true,
            currentTime: this.start.positionSec,
            media: {
                contentId: this.start.url,
                contentType: "video/mp4",
                streamType: "BUFFERED",
                metadata: { metadataType: 0, title: this.start.title },
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
        if (state === "IDLE") {
            // Idle before anything played is the receiver getting ready, not the end.
            if (this.loaded) {
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
            positionSec: status.currentTime ?? this.snapshot.positionSec,
            durationSec: Math.floor(status.media?.duration ?? this.snapshot.durationSec),
        });
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
        AppLogger.warn(undefined, { message: `[Cast] ${this.start.device.name}: ${error}`, error: cause });
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

    private set(change: Partial<CastSession>) {
        this.snapshot = { ...this.snapshot, ...change, updatedAt: Date.now() };
        this.onChange();
    }
}
