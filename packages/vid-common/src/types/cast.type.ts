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
export interface CastSession {
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
    sessions: CastSession[];
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

export type VideoAppActionPayloadRequestMap = {
    /** Starts the live cast updates. The response is the current state. */
    cast_subscribe: Record<string, never>;
};

export type VideoAppActionPayloadResponseMap = {
    cast_subscribe: CastState;
    /** Pushed to subscribers whenever a device appears or goes, or a session changes. */
    cast_state: CastState;
};

export type VideoAppRequestMessage<Action extends WebSocketAction<VideoAppActionPayloadRequestMap>> = WebSocketMessage<
    Action,
    VideoAppActionPayloadRequestMap
>;
export type VideoAppResponseMessage<Action extends WebSocketAction<VideoAppActionPayloadResponseMap>> = WebSocketResponse<
    Action,
    VideoAppActionPayloadResponseMap
>;
