import {
    ChromecastCommands,
    ChromecastHealth,
    ChromecastDevice,
    ChromecastPlayback,
    ChromecastUpcoming,
    ChromecastPlaybackState,
    ChromecastState,
} from "@aud/common";
import { AppErrorV2, AppLogger, WebSocketDetails } from "@uxp/bff-common";
import axios from "axios";
import { ErrorCodes } from "@uxp/common";
import { Channel, Client } from "castv2";
import { amplifierService } from "../amplifier/amplifier.service";
import { playerService } from "../player/player.service";
import { AudioServerWebSocketManager } from "../ws/AudioServerWebSocketManager";
import { ChromecastConfig, chromecastConfig } from "./chromecast.config";

const CHROMECAST_TOPIC = "chromecast";

const CAST_PORT = 8009;
const HTTP_PORT = 8008;
const SENDER = "sender-0";
const RECEIVER = "receiver-0";
const NS_CONNECTION = "urn:x-cast:com.google.cast.tp.connection";
const NS_HEARTBEAT = "urn:x-cast:com.google.cast.tp.heartbeat";
const NS_RECEIVER = "urn:x-cast:com.google.cast.receiver";
const NS_MEDIA = "urn:x-cast:com.google.cast.media";

const HEARTBEAT_INTERVAL_MS = 5000;
// No answer to the pings for this long means the connection is dead, as when the device loses power.
const HEARTBEAT_TIMEOUT_MS = 15000;
// Status pushes are not reliable on their own, so the status is also asked for now and then.
const STATUS_POLL_MS = 4000;
const RECONNECT_MIN_MS = 2000;
const RECONNECT_MAX_MS = 30000;
const DEVICE_REFRESH_MS = 60000;
const DEVICE_TIMEOUT_MS = 3000;
// The device goes down about 15 s after the reboot call and is back after about 40 s.
const REBOOT_TIMEOUT_MS = 5000;

// Bits of `supportedMediaCommands`.
const COMMAND_PAUSE = 1;
const COMMAND_SEEK = 2;
const COMMAND_NEXT = 64;
const COMMAND_PREVIOUS = 128;

/** The part of a media status that is used. Other fields can carry a stream URL with a token and are never read. */
type CastMediaStatus = {
    mediaSessionId?: number;
    playerState?: string;
    currentTime?: number;
    supportedMediaCommands?: number;
    media?: {
        duration?: number;
        streamType?: string;
        /** Spotify keeps its queue here; only `next_tracks` is read. */
        customData?: {
            playerPlaybackState?: {
                track_window?: { next_tracks?: { name?: string; artists?: { name?: string }[] }[] };
            };
        };
        metadata?: {
            title?: string;
            artist?: string;
            albumArtist?: string;
            subtitle?: string;
            albumName?: string;
            images?: { url?: string; width?: number }[];
        };
    };
};

type CastApplication = { displayName?: string; transportId?: string; sessionId?: string };

type EurekaInfo = {
    name?: string;
    cast_build_revision?: string;
    uptime?: number;
    signal_level?: number;
    ip_address?: string;
    has_update?: boolean;
};

const PLAYBACK_STATES: ChromecastPlaybackState[] = ["PLAYING", "PAUSED", "BUFFERING", "IDLE"];

/** A live connection to the device. Everything that belongs to one connection is dropped with it. */
type Connection = {
    client: Client;
    receiver: Channel;
    heartbeat: Channel;
    timers: NodeJS.Timeout[];
    lastPong: number;
    /** The running app that the media channel is joined to. */
    joined?: { transportId: string; connection: Channel; media: Channel; mediaSessionId?: number };
    /** Session of the running app, which stopping it needs. */
    sessionId?: string;
    requestId: number;
    /** True until the first receiver status: an app that is found running then was cast before this connection, not just now. */
    awaitingFirstStatus: boolean;
};

/**
 * Watches the Chromecast as an extra sender, so that the one that cast is not disturbed, and keeps its state for
 * subscribed clients. The connection is kept up all the time, because the state is also needed when nobody is
 * subscribed. The device may sleep or reboot: a failed connection is retried with a growing delay.
 */
export class ChromecastService {
    private state: ChromecastState;
    private current?: Connection;
    private reconnectTimer?: NodeJS.Timeout;
    private reconnectDelay = RECONNECT_MIN_MS;
    private deviceTimer?: NodeJS.Timeout;
    /** When the device stopped answering (or the server started without it), undefined while it is connected. */
    private unreachableSince?: number;

    constructor(
        private readonly config: ChromecastConfig,
        private readonly wsManager: AudioServerWebSocketManager
    ) {
        this.state = { configured: config.host !== undefined, reachable: false, app: null, playback: null };
        this.unreachableSince = Date.now();
    }

    /** Connects to the Chromecast, if one is configured. */
    start() {
        if (!this.config.host) {
            AppLogger.info(undefined, { message: "No Chromecast configured (AUD_CHROMECAST_HOST)" });
            return;
        }
        this.connect(this.config.host);
        void this.refreshDevice(this.config.host);
    }

    subscribe(socket: WebSocketDetails["socket"]): ChromecastState {
        this.wsManager.joinTopic(socket, CHROMECAST_TOPIC);
        return this.state;
    }

    getState(): ChromecastState {
        return this.state;
    }

    /** For the health check: whether the Chromecast is watched at all, and how it is doing. */
    checkHealth(): ChromecastHealth {
        return {
            enabled: this.state.configured,
            reachable: this.state.reachable,
            unreachableSec: this.unreachableSince === undefined ? undefined : Math.floor((Date.now() - this.unreachableSince) / 1000),
            wifiSignalDbm: this.state.device?.wifiSignalDbm,
        };
    }

    private connect(host: string) {
        const client = new Client();
        let connection: Connection | undefined;
        let failed = false;
        // Both an error and the close that follows it arrive here, and a new attempt must be scheduled only once.
        const fail = (reason: string, error?: unknown) => {
            if (failed) {
                return;
            }
            failed = true;
            this.unreachableSince ??= Date.now();
            AppLogger.warn(undefined, { message: `Lost the Chromecast: ${reason}`, error });
            if (connection) {
                this.drop(connection);
            }
            this.update({ ...this.state, reachable: false, app: null, playback: null });
            this.scheduleReconnect(host);
        };
        client.on("error", (error) => fail("connection error", error));
        client.on("close", () => fail("connection closed"));
        client.connect({ host, port: CAST_PORT }, () => {
            connection = this.open(client);
            this.current = connection;
            this.reconnectDelay = RECONNECT_MIN_MS;
            this.unreachableSince = undefined;
            this.update({ ...this.state, reachable: true });
            // After a reboot the uptime and the rest are stale until the next timer tick, so read them now.
            void this.refreshDevice(host);
        });
    }

    private open(client: Client): Connection {
        const connectionChannel = client.createChannel(SENDER, RECEIVER, NS_CONNECTION, "JSON");
        const heartbeat = client.createChannel(SENDER, RECEIVER, NS_HEARTBEAT, "JSON");
        const receiver = client.createChannel(SENDER, RECEIVER, NS_RECEIVER, "JSON");
        const connection: Connection = {
            client,
            receiver,
            heartbeat,
            timers: [],
            lastPong: Date.now(),
            requestId: 100,
            awaitingFirstStatus: true,
        };

        connectionChannel.send({ type: "CONNECT" });
        heartbeat.on("message", (data) => {
            if (data?.type === "PONG") {
                connection.lastPong = Date.now();
            }
        });
        receiver.on("message", (data) => {
            if (data?.type === "RECEIVER_STATUS") {
                this.onReceiverStatus(connection, data.status?.applications ?? []);
            }
        });

        connection.timers.push(
            setInterval(() => {
                if (Date.now() - connection.lastPong > HEARTBEAT_TIMEOUT_MS) {
                    client.emit("error", new Error("No answer to the heartbeat"));
                    return;
                }
                heartbeat.send({ type: "PING" });
            }, HEARTBEAT_INTERVAL_MS),
            setInterval(() => this.requestStatus(connection), STATUS_POLL_MS)
        );
        this.requestStatus(connection);
        return connection;
    }

    play() {
        return this.mediaCommand("PLAY");
    }

    pause() {
        return this.mediaCommand("PAUSE", "pause");
    }

    /** For when the amplifier leaves the Chromecast input: what is cast is not heard, so it is paused. Never throws. */
    pauseIfPlaying() {
        if (this.state.playback?.state !== "PLAYING" || !this.state.playback.commands.pause) {
            return;
        }
        try {
            this.pause();
        } catch (error) {
            AppLogger.warn(undefined, { message: "Could not pause the Chromecast", error });
        }
    }

    seek(positionSec: number) {
        return this.mediaCommand("SEEK", "seek", { currentTime: positionSec });
    }

    next() {
        return this.mediaCommand("QUEUE_NEXT", "next");
    }

    previous() {
        return this.mediaCommand("QUEUE_PREV", "previous");
    }

    /** Stops the running app, which also clears a receiver that sits open and empty. */
    stopApp(): ChromecastState {
        const connection = this.requireConnection();
        if (!connection.sessionId) {
            return this.state;
        }
        this.send(connection, connection.receiver, { type: "STOP", sessionId: connection.sessionId });
        return this.state;
    }

    /** The device is unreachable for a while after this, which the connection reports like any other loss. */
    async reboot(): Promise<ChromecastState> {
        const host = this.requireHost();
        try {
            await axios.post(`http://${host}:${HTTP_PORT}/setup/reboot`, { params: "now" }, { timeout: REBOOT_TIMEOUT_MS });
        } catch (error) {
            throw new AppErrorV2({
                statusCode: 502,
                code: ErrorCodes.INTERNAL_SERVER_ERROR,
                message: "The Chromecast did not accept the reboot",
                originalError: error as Error,
            });
        }
        return this.state;
    }

    async selectAmplifier(): Promise<ChromecastState> {
        await amplifierService.prepareForChromecast();
        return this.state;
    }

    /** A command the app does not list as supported is refused here, as the app would ignore it. */
    private mediaCommand(type: string, supported?: keyof ChromecastCommands, extra: object = {}): ChromecastState {
        const connection = this.requireConnection();
        const joined = connection.joined;
        const playback = this.state.playback;
        if (!joined || joined.mediaSessionId === undefined || !playback) {
            throw new AppErrorV2({ statusCode: 409, code: ErrorCodes.INVALID_STATE, message: "Nothing is playing on the Chromecast", params: { reason: "nothing-playing" } });
        }
        if (supported && !playback.commands[supported]) {
            throw new AppErrorV2({
                statusCode: 409,
                code: ErrorCodes.INVALID_STATE,
                message: `${this.state.app ?? "The app"} does not support ${supported}`,
                params: { reason: "unsupported", app: this.state.app ?? "" },
            });
        }
        this.send(connection, joined.media, { type, mediaSessionId: joined.mediaSessionId, ...extra });
        return this.state;
    }

    private send(connection: Connection, channel: Channel, message: object) {
        try {
            channel.send({ ...message, requestId: connection.requestId++ });
        } catch (error) {
            connection.client.emit("error", error);
            throw new AppErrorV2({
                statusCode: 502,
                code: ErrorCodes.INTERNAL_SERVER_ERROR,
                message: "The Chromecast did not take the command",
                originalError: error as Error,
            });
        }
    }

    private requireHost(): string {
        if (!this.config.host) {
            throw new AppErrorV2({ statusCode: 400, code: ErrorCodes.SERVICE_NOT_CONFIGURED, message: "No Chromecast is configured" });
        }
        return this.config.host;
    }

    private requireConnection(): Connection {
        this.requireHost();
        if (!this.current) {
            throw new AppErrorV2({
                statusCode: 503,
                code: ErrorCodes.UNREACHABLE,
                message: "The Chromecast is not reachable",
                params: { resource: "Chromecast" },
            });
        }
        return this.current;
    }

    private requestStatus(connection: Connection) {
        try {
            connection.receiver.send({ type: "GET_STATUS", requestId: 1 });
            connection.joined?.media.send({ type: "GET_STATUS", requestId: 2 });
        } catch (error) {
            connection.client.emit("error", error);
        }
    }

    private onReceiverStatus(connection: Connection, applications: CastApplication[]) {
        // The built-in backdrop app is not something that was cast.
        const app = applications.find((a) => a.transportId) ?? null;
        const wasRunning = connection.awaitingFirstStatus;
        if (connection.joined?.transportId !== app?.transportId) {
            this.leave(connection);
            if (app?.transportId) {
                this.join(connection, app.transportId, wasRunning);
            }
        }
        connection.sessionId = app?.sessionId;
        connection.awaitingFirstStatus = false;
        const name = app ? (app.displayName ?? null) : null;
        this.update({ ...this.state, app: name, playback: app ? this.state.playback : null });
    }

    /** `replay`: the app was running before this connection, so its first status is not a cast that starts. */
    private join(connection: Connection, transportId: string, replay: boolean) {
        const connectionChannel = connection.client.createChannel(SENDER, transportId, NS_CONNECTION, "JSON");
        const media = connection.client.createChannel(SENDER, transportId, NS_MEDIA, "JSON");
        connection.joined = { transportId, connection: connectionChannel, media };
        connectionChannel.send({ type: "CONNECT" });
        // Once per cast: the pauses between tracks (buffering, idle) are not a new cast, only a pause by the user is.
        let announced = false;
        let first = true;
        // A status after a pause or a seek leaves out the media, which has not changed: the last one of the same session is kept.
        let lastMedia: { mediaSessionId?: number; media: CastMediaStatus["media"] } | undefined;
        media.on("message", (data) => {
            if (data?.type === "MEDIA_STATUS" && connection.joined?.media === media) {
                const status: CastMediaStatus | undefined = data.status?.[0];
                connection.joined.mediaSessionId = status?.mediaSessionId;
                if (status?.media) {
                    lastMedia = { mediaSessionId: status.mediaSessionId, media: status.media };
                }
                const mediaInfo = status?.media ?? (lastMedia?.mediaSessionId === status?.mediaSessionId ? lastMedia?.media : undefined);
                const playback = this.toPlayback(status && { ...status, media: mediaInfo });
                let startsPlaying = false;
                if (playback?.state === "PAUSED") {
                    announced = false;
                } else if (playback?.state === "PLAYING" && !announced) {
                    announced = true;
                    // An app that was already playing when this connection was made is not a cast that starts.
                    startsPlaying = !(replay && first);
                }
                first = false;
                this.update({ ...this.state, playback });
                if (startsPlaying) {
                    this.onStartsPlaying();
                }
            }
        });
        media.send({ type: "GET_STATUS", requestId: 2 });
    }

    /** The cast wins: the amplifier goes to the Chromecast (if set up for it) and what aud plays pauses. */
    private onStartsPlaying() {
        if (this.state.app) {
            this.update({ ...this.state, lastCast: { app: this.state.app, at: new Date().toISOString() } });
        }
        if (!amplifierService.hasChromecastInput()) {
            return;
        }
        playerService.yieldToChromecast();
        amplifierService
            .prepareForChromecast()
            .catch((error) => AppLogger.warn(undefined, { message: "Could not switch the amplifier to the Chromecast", error }));
    }

    private leave(connection: Connection) {
        const joined = connection.joined;
        connection.joined = undefined;
        if (!joined) {
            return;
        }
        try {
            joined.connection.send({ type: "CLOSE" });
        } catch {
            // The connection is gone already, which is what leaving is for.
        }
        joined.media.close();
        joined.connection.close();
        this.state = { ...this.state, playback: null };
    }

    /** Only whitelisted fields leave this method. A status without media, as of an app that sits open, gives null. */
    private toPlayback(status: CastMediaStatus | undefined): ChromecastPlayback | null {
        const metadata = status?.media?.metadata;
        if (!status || !status.media || !PLAYBACK_STATES.includes(status.playerState as ChromecastPlaybackState)) {
            return null;
        }
        const commands = status.supportedMediaCommands ?? 0;
        const cover = [...(metadata?.images ?? [])].filter((i) => i.url).sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
        const isLive = status.media.streamType === "LIVE";
        return {
            state: status.playerState as ChromecastPlaybackState,
            // YouTube has no title until a few seconds after it starts buffering.
            title: metadata?.title ?? "",
            artist: metadata?.artist ?? metadata?.albumArtist ?? metadata?.subtitle,
            album: metadata?.albumName,
            coverUrl: cover?.url,
            positionSec: status.currentTime ?? 0,
            durationSec: !isLive && status.media.duration ? Math.floor(status.media.duration) : undefined,
            commands: this.toCommands(commands),
            upcoming: this.toUpcoming(status),
        };
    }

    private toUpcoming(status: CastMediaStatus): ChromecastUpcoming[] | undefined {
        const next = status.media?.customData?.playerPlaybackState?.track_window?.next_tracks;
        if (!next?.length) return undefined;
        return next
            .filter((track) => track.name)
            .map((track) => ({
                title: track.name as string,
                artist:
                    track.artists
                        ?.map((artist) => artist.name)
                        .filter(Boolean)
                        .join(", ") || undefined,
            }));
    }

    private toCommands(bits: number): ChromecastCommands {
        return {
            pause: (bits & COMMAND_PAUSE) !== 0,
            seek: (bits & COMMAND_SEEK) !== 0,
            next: (bits & COMMAND_NEXT) !== 0,
            previous: (bits & COMMAND_PREVIOUS) !== 0,
        };
    }

    private drop(connection: Connection) {
        if (this.current === connection) {
            this.current = undefined;
        }
        connection.timers.forEach(clearInterval);
        connection.joined = undefined;
        try {
            connection.client.close();
        } catch {
            // Already closed.
        }
    }

    private scheduleReconnect(host: string) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(host), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
    }

    /** Reads the facts about the device itself. A failure keeps the previous ones, the connection tells if it is reachable. */
    private async refreshDevice(host: string) {
        try {
            const { data } = await axios.get<EurekaInfo>(`http://${host}:${HTTP_PORT}/setup/eureka_info`, {
                params: { options: "detail" },
                timeout: DEVICE_TIMEOUT_MS,
            });
            const device: ChromecastDevice = {
                name: data.name ?? "",
                firmware: data.cast_build_revision ?? "",
                uptimeSec: Math.round(data.uptime ?? 0),
                wifiSignalDbm: data.signal_level,
                ip: data.ip_address ?? host,
                hasUpdate: data.has_update ?? false,
            };
            this.update({ ...this.state, device });
        } catch (error) {
            AppLogger.debug(undefined, { message: `Could not read the Chromecast device info: ${error}` });
        }
        clearTimeout(this.deviceTimer);
        this.deviceTimer = setTimeout(() => void this.refreshDevice(host), DEVICE_REFRESH_MS);
    }

    private update(next: ChromecastState) {
        if (JSON.stringify(next) === JSON.stringify(this.state)) {
            return;
        }
        this.state = next;
        this.wsManager.broadcastToTopic(CHROMECAST_TOPIC, { action: "chromecast_state", success: true, payload: next });
    }
}

export const chromecastService = new ChromecastService(chromecastConfig, AudioServerWebSocketManager.getInstance());

amplifierService.onChromecastInputLeft(() => chromecastService.pauseIfPlaying());
