import { WebSocketAction, WebSocketMessage, WebSocketResponse } from "@uxp/common";

/** A Chromecast found on the network. */
export interface CastDevice {
    /** Stable id of the device, from its mDNS record. */
    id: string;
    name: string;
    model: string;
}

export type CastPlayerState = "PLAYING" | "PAUSED" | "BUFFERING" | "LOADING" | "IDLE" | "ENDED" | "FAILED";

/** A clip loaded on one Chromecast. A device has at most one. */
export interface CastSessionSnapshot {
    deviceId: string;
    deviceName: string;
    clipId: string;
    title: string;
    state: CastPlayerState;
    positionSec: number;
    durationSec: number;
    /** When the position was read, so the UI can move it on between the pushes. Epoch milliseconds. */
    updatedAt: number;
    /** Why a session failed, shown in the bar. */
    error?: string;
}

export interface CastState {
    /** False when the BFF has no address that a Chromecast can fetch the streams from. */
    configured: boolean;
    devices: CastDevice[];
    sessions: CastSessionSnapshot[];
}

/** Starts a clip on each of the devices. A device that already has a session gets the new clip instead. */
export interface CastStartRequest {
    clipId: string;
    deviceIds: string[];
    /** Where to start, in seconds. Used for the handover from the browser. */
    positionSec?: number;
}

export interface CastDeviceParams {
    deviceId: string;
}

export interface CastSeekRequest {
    positionSec: number;
}

export type VideoAppRequestMessage<Action extends WebSocketAction<VideoAppActionPayloadRequestMap>> = WebSocketMessage<
    Action,
    VideoAppActionPayloadRequestMap
>;
export type VideoAppResponseMessage<Action extends WebSocketAction<VideoAppActionPayloadResponseMap>> = WebSocketResponse<
    Action,
    VideoAppActionPayloadResponseMap
>;

/** What a Chromecast plays right now, whoever cast it. */
export interface ChromecastPlayback {
    state: "PLAYING" | "PAUSED" | "BUFFERING" | "IDLE";
    title: string;
    subtitle?: string;
    imageUrl?: string;
    positionSec: number;
    durationSec?: number;
    /** What the app on the device accepts. A button for the rest has no use. */
    commands: { pause: boolean; seek: boolean };
    /** Set when it is a clip of the library. */
    clipId?: string;
    /** When the position was read, epoch milliseconds, so the UI can move it on between the pushes. */
    updatedAt: number;
}

/** A Chromecast with what is known of the device itself and of what runs on it. */
export interface ChromecastInfo {
    id: string;
    name: string;
    model: string;
    ip: string;
    reachable: boolean;
    firmware?: string;
    uptimeSec?: number;
    wifiSignalDbm?: number;
    hasUpdate?: boolean;
    /**
     * Whether the device takes the restart call. Google TV and Android TV models do not answer the Wi-Fi fields and refuse the call,
     * so a device that reports a Wi-Fi signal does. Undefined until the device info has been read.
     */
    canRestart?: boolean;
    /** Name of the running app, null when only the backdrop shows. */
    app: string | null;
    playback: ChromecastPlayback | null;
}

export interface ChromecastsState {
    devices: ChromecastInfo[];
}

export type VideoAppActionPayloadRequestMap = {
    /** Starts the live cast updates. The response is the current state. */
    cast_subscribe: Record<string, never>;
    /** Starts the live updates of the Chromecast page. The response is the current state. */
    chromecasts_subscribe: Record<string, never>;
};

export type VideoAppActionPayloadResponseMap = {
    cast_subscribe: CastState;
    /** Pushed to subscribers whenever a device appears or goes, or a session changes. */
    cast_state: CastState;
    chromecasts_subscribe: ChromecastsState;
    /** Pushed to subscribers whenever something but the position of a Chromecast changes. */
    chromecasts_state: ChromecastsState;
};
