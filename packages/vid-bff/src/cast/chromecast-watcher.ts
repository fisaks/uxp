import { ChromecastInfo, ChromecastPlayback } from "@vid/common";
import { AppLogger } from "@uxp/bff-common";
import axios from "axios";
import { Channel, Client } from "castv2";
import { FoundDevice } from "./cast-discovery";
import { isPhilipsTv, readActivity, readPowerState, writePowerState } from "./philips-tv";
import { TvPower } from "./tv-power";

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
const STATUS_POLL_MS = 5000;
const RECONNECT_MIN_MS = 2000;
const RECONNECT_MAX_MS = 60000;
const DEVICE_REFRESH_MS = 60000;
const DEVICE_TIMEOUT_MS = 3000;
const POWER_SETTLE_MS = 2000;
// What the receiver calls the app that a cast of ours runs, which sits open and empty when a clip has ended.
const CAST_APP_NAME = "Default Media Receiver";
// The device goes down about 15 s after the reboot call and is back after about 40 s.
const REBOOT_TIMEOUT_MS = 5000;

// Bits of `supportedMediaCommands`.
const COMMAND_PAUSE = 1;
const COMMAND_SEEK = 2;

const PLAYBACK_STATES: ChromecastPlayback["state"][] = ["PLAYING", "PAUSED", "BUFFERING", "IDLE"];

/** The part of a media status that is used. Other fields can carry a stream URL with a token and are never read or logged. */
type CastMediaStatus = {
    mediaSessionId?: number;
    playerState?: string;
    currentTime?: number;
    supportedMediaCommands?: number;
    media?: {
        contentId?: string;
        duration?: number;
        streamType?: string;
        metadata?: { title?: string; subtitle?: string; artist?: string; images?: { url?: string; width?: number }[] };
    };
};

type CastApplication = { displayName?: string; transportId?: string; sessionId?: string };

type EurekaInfo = {
    cast_build_revision?: string;
    uptime?: number;
    signal_level?: number;
    has_update?: boolean;
};

/** A live connection to the device. Everything that belongs to one connection is dropped with it. */
type Connection = {
    client: Client;
    receiver: Channel;
    timers: NodeJS.Timeout[];
    lastPong: number;
    requestId: number;
    /** Session of the running app, which stopping it needs. */
    sessionId?: string;
    /** The running app that the media channel is joined to. */
    joined?: { transportId: string; connection: Channel; media: Channel; mediaSessionId?: number };
};

/**
 * Watches one Chromecast as an extra sender, so that whoever casts is not disturbed: no launch, no load. It keeps the
 * connection up (the device may sleep or reboot: a failed connection is retried with a growing delay) and tells what the
 * device is and what it plays. `clipOf` tells whether the media address is a clip of the library; the address itself leaves
 * this class never.
 */
export class ChromecastWatcher {
    private info: ChromecastInfo;
    private connection?: Connection;
    private reconnectTimer?: NodeJS.Timeout;
    private reconnectDelay = RECONNECT_MIN_MS;
    private deviceTimer?: NodeJS.Timeout;
    private stopped = false;
    /** A status after a pause or a seek leaves out the media, which has not changed: the last one of the same session is kept. */
    private lastMedia?: { mediaSessionId?: number; media: CastMediaStatus["media"] };
    /** What the receiver last said about standby; unknown without a connection. */
    private standBy?: boolean;

    constructor(
        readonly device: FoundDevice,
        private readonly clipOf: (contentId: string) => string | undefined,
        private readonly onChange: () => void,
        private readonly tvPower: TvPower
    ) {
        this.info = {
            id: device.id,
            name: device.name,
            model: device.model,
            ip: device.host,
            reachable: false,
            app: null,
            playback: null,
        };
    }

    get snapshot(): ChromecastInfo {
        return this.info;
    }

    start() {
        this.connect();
    }

    /** True when the receiver says the device sleeps, so that a cast that starts now wakes it. */
    get isStandBy(): boolean {
        return this.standBy === true;
    }

    stop() {
        this.stopped = true;
        clearTimeout(this.reconnectTimer);
        clearTimeout(this.deviceTimer);
        if (this.connection) {
            this.drop(this.connection);
        }
    }

    play() {
        this.mediaCommand("PLAY");
    }

    pause() {
        this.mediaCommand("PAUSE", "pause");
    }

    seek(positionSec: number) {
        this.mediaCommand("SEEK", "seek", { currentTime: positionSec });
    }

    /** Stops the running app, which also clears a receiver that sits open and empty. False when nothing runs. */
    stopApp(): boolean {
        const connection = this.connection;
        if (!connection?.sessionId) {
            return false;
        }
        this.send(connection, connection.receiver, { type: "STOP", sessionId: connection.sessionId });
        return true;
    }

    /** The device is unreachable for a while after this, which the connection reports like any other loss. */
    async reboot() {
        await axios.post(`http://${this.device.host}:${HTTP_PORT}/setup/reboot`, { params: "now" }, { timeout: REBOOT_TIMEOUT_MS });
    }

    private connect() {
        const client = new Client();
        let connection: Connection | undefined;
        let failed = false;
        // Both an error and the close that follows it arrive here, and a new attempt must be scheduled only once.
        const fail = (reason: string, error?: unknown) => {
            if (failed || this.stopped) {
                return;
            }
            failed = true;
            if (this.info.reachable) {
                AppLogger.warn(undefined, { message: `[Cast] Lost "${this.device.name}": ${reason}`, error });
            }
            if (connection) {
                this.drop(connection);
            }
            this.standBy = undefined;
            this.update({ reachable: false, app: null, playback: null });
            this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
        };
        client.on("error", (error) => fail("connection error", error));
        client.on("close", () => fail("connection closed"));
        client.connect({ host: this.device.host, port: CAST_PORT }, () => {
            connection = this.open(client);
            this.connection = connection;
            this.reconnectDelay = RECONNECT_MIN_MS;
            this.update({ reachable: true });
            // After a reboot the uptime and the rest are stale until the next timer tick, so read them now.
            void this.refreshDevice();
        });
    }

    private open(client: Client): Connection {
        const connectionChannel = client.createChannel(SENDER, RECEIVER, NS_CONNECTION, "JSON");
        const heartbeat = client.createChannel(SENDER, RECEIVER, NS_HEARTBEAT, "JSON");
        const receiver = client.createChannel(SENDER, RECEIVER, NS_RECEIVER, "JSON");
        const connection: Connection = { client, receiver, timers: [], lastPong: Date.now(), requestId: 100 };

        connectionChannel.send({ type: "CONNECT" });
        heartbeat.on("message", (data) => {
            if (data?.type === "PONG") {
                connection.lastPong = Date.now();
            }
        });
        receiver.on("message", (data) => {
            if (data?.type === "RECEIVER_STATUS") {
                this.standBy = data.status?.isStandBy;
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

    private requestStatus(connection: Connection) {
        try {
            connection.receiver.send({ type: "GET_STATUS", requestId: 1 });
            connection.joined?.media.send({ type: "GET_STATUS", requestId: 2 });
        } catch (error) {
            connection.client.emit("error", error);
        }
    }

    private onReceiverStatus(connection: Connection, applications: CastApplication[]) {
        // The built-in backdrop app has no transport id and is not something that was cast.
        const app = applications.find((a) => a.transportId) ?? null;
        if (connection.joined?.transportId !== app?.transportId) {
            this.leave(connection);
            if (app?.transportId) {
                this.join(connection, app.transportId);
            }
        }
        connection.sessionId = app?.sessionId;
        this.update({ app: app ? (app.displayName ?? null) : null, playback: app ? this.info.playback : null });
    }

    private join(connection: Connection, transportId: string) {
        const connectionChannel = connection.client.createChannel(SENDER, transportId, NS_CONNECTION, "JSON");
        const media = connection.client.createChannel(SENDER, transportId, NS_MEDIA, "JSON");
        connection.joined = { transportId, connection: connectionChannel, media };
        this.lastMedia = undefined;
        connectionChannel.send({ type: "CONNECT" });
        media.on("message", (data) => {
            if (data?.type === "MEDIA_STATUS" && connection.joined?.media === media) {
                const status: CastMediaStatus | undefined = data.status?.[0];
                connection.joined.mediaSessionId = status?.mediaSessionId;
                if (status?.media) {
                    this.lastMedia = { mediaSessionId: status.mediaSessionId, media: status.media };
                }
                const mediaInfo =
                    status?.media ?? (this.lastMedia?.mediaSessionId === status?.mediaSessionId ? this.lastMedia?.media : undefined);
                this.update({ playback: this.toPlayback(status && { ...status, media: mediaInfo }) });
            }
        });
        media.send({ type: "GET_STATUS", requestId: 2 });
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
        this.info = { ...this.info, playback: null };
    }

    /** Only whitelisted fields leave this method. A status without media, as of an app that sits open, gives null. */
    private toPlayback(status: CastMediaStatus | undefined): ChromecastPlayback | null {
        const media = status?.media;
        if (!status || !media || !PLAYBACK_STATES.includes(status.playerState as ChromecastPlayback["state"])) {
            return null;
        }
        const metadata = media.metadata;
        const bits = status.supportedMediaCommands ?? 0;
        const image = [...(metadata?.images ?? [])].filter((i) => i.url).sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
        return {
            state: status.playerState as ChromecastPlayback["state"],
            title: metadata?.title ?? "",
            subtitle: metadata?.subtitle ?? metadata?.artist,
            imageUrl: image?.url,
            positionSec: status.currentTime ?? 0,
            durationSec: media.streamType !== "LIVE" && media.duration ? Math.floor(media.duration) : undefined,
            commands: { pause: (bits & COMMAND_PAUSE) !== 0, seek: (bits & COMMAND_SEEK) !== 0 },
            clipId: media.contentId ? this.clipOf(media.contentId) : undefined,
            updatedAt: Date.now(),
        };
    }

    /** A command the app does not list as supported is not sent, as the app would ignore it. */
    private mediaCommand(type: string, supported?: "pause" | "seek", extra: object = {}) {
        const connection = this.connection;
        const joined = connection?.joined;
        const playback = this.info.playback;
        if (!connection || !joined || joined.mediaSessionId === undefined || !playback) {
            throw new Error("Nothing is playing");
        }
        if (supported && !playback.commands[supported]) {
            throw new Error(`${this.info.app ?? "The app"} does not support ${supported}`);
        }
        this.send(connection, joined.media, { type, mediaSessionId: joined.mediaSessionId, ...extra });
    }

    private send(connection: Connection, channel: Channel, message: object) {
        try {
            channel.send({ ...message, requestId: connection.requestId++ });
        } catch (error) {
            connection.client.emit("error", error);
            throw new Error("The Chromecast did not take the command");
        }
    }

    private drop(connection: Connection) {
        if (this.connection === connection) {
            this.connection = undefined;
        }
        connection.timers.forEach(clearInterval);
        connection.joined = undefined;
        try {
            connection.client.close();
        } catch {
            // Already closed.
        }
    }

    /** Reads the facts about the device itself. A failure keeps the previous ones, the connection tells if it is reachable. */
    private async refreshDevice() {
        try {
            const { data } = await axios.get<EurekaInfo>(`http://${this.device.host}:${HTTP_PORT}/setup/eureka_info`, {
                params: { options: "detail" },
                timeout: DEVICE_TIMEOUT_MS,
            });
            this.update({
                firmware: data.cast_build_revision,
                uptimeSec: Math.round(data.uptime ?? 0),
                wifiSignalDbm: data.signal_level,
                hasUpdate: data.has_update ?? false,
                canRestart: data.signal_level !== undefined,
            });
        } catch (error) {
            AppLogger.debug(undefined, { message: `[Cast] Could not read the device info of "${this.device.name}": ${error}` });
        }
        await this.refreshPower();
        clearTimeout(this.deviceTimer);
        if (!this.stopped) {
            this.deviceTimer = setTimeout(() => void this.refreshDevice(), DEVICE_REFRESH_MS);
        }
    }

    /** Whether the device is a Philips TV with power control, and what a paired one says. A TV that sleeps may not answer: it stays what it was. */
    async refreshPower() {
        if (this.info.powerControl === undefined || this.info.powerControl === "unavailable") {
            if (!(await isPhilipsTv(this.device.host))) {
                this.update({ powerControl: "unavailable" });
                return;
            }
        }
        const credentials = this.tvPower.credentials(this.device.id);
        if (!credentials) {
            this.update({ powerControl: "unpaired", powerState: undefined });
            return;
        }
        this.update({ powerControl: "paired" });
        try {
            this.update({ powerState: await readPowerState(this.device.host, credentials) });
        } catch (error) {
            AppLogger.debug(undefined, { message: `[Cast] Could not read the power state of "${this.device.name}": ${error}` });
        }
    }

    /** Switches a paired TV on or off, then reads what it says now. */
    async setPower(state: "On" | "Standby") {
        const credentials = this.tvPower.credentials(this.device.id);
        if (!credentials) {
            throw new Error("The TV is not paired");
        }
        await writePowerState(this.device.host, credentials, state);
        // The TV takes a moment to change state.
        await new Promise((resolve) => setTimeout(resolve, POWER_SETTLE_MS));
        await this.refreshPower();
    }

    /** The app in front on a paired TV, undefined when it cannot be read. */
    async currentActivity(): Promise<string | undefined> {
        const credentials = this.tvPower.credentials(this.device.id);
        if (!credentials) {
            return undefined;
        }
        try {
            return await readActivity(this.device.host, credentials);
        } catch (error) {
            AppLogger.debug(undefined, { message: `[Cast] Could not read the app in front of "${this.device.name}": ${error}` });
            return undefined;
        }
    }

    /**
     * Switches a paired TV to standby when it is on and the app in front is one of `known`, those that were in front while the cast
     * played and after it. The Cast receiver does not see native apps, so the app in front is what tells. A TV that cannot be read is
     * left on. False when it was left as it was. The power state is read afresh: the last reading can be a minute old.
     */
    async standByIfIdle(known: ReadonlySet<string>): Promise<boolean> {
        await this.refreshPower();
        const { reachable, powerControl, powerState, app, playback } = this.info;
        const playing = playback !== null && playback.state !== "IDLE";
        const otherApp = app !== null && app !== CAST_APP_NAME;
        if (!reachable || powerControl !== "paired" || powerState !== "On" || playing || otherApp) {
            return false;
        }
        const activity = await this.currentActivity();
        if (activity === undefined || !known.has(activity)) {
            AppLogger.info(undefined, {
                message: `[Cast] "${this.device.name}" is left on: the app in front is ${activity ?? "unknown"}, during and after the cast it was ${[...known].join(", ") || "unknown"}`,
            });
            return false;
        }
        AppLogger.info(undefined, {
            message: `[Cast] Switching off "${this.device.name}": the app in front is ${activity}, app ${app ?? "none"}, playback ${playback?.state ?? "none"}`,
        });
        await this.setPower("Standby");
        return true;
    }

    private update(change: Partial<ChromecastInfo>) {
        this.info = { ...this.info, ...change };
        this.onChange();
    }
}
