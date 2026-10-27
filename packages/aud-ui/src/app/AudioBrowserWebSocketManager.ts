import { AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap } from "@aud/common";
import { BrowserWebSocketManager, ErrorHandler, useWebSocket, WebSocketResponseListenerObj } from "@uxp/ui-lib";
import { getWSPath } from "../config";

export type AudioAppWebSocketResponseListener = WebSocketResponseListenerObj<AudioAppActionPayloadResponseMap>;
export type AudioAppErrorHandler = ErrorHandler<AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap>;

export class AudioAppBrowserWebSocketManager extends BrowserWebSocketManager<
    AudioAppActionPayloadRequestMap,
    AudioAppActionPayloadResponseMap
> {
    private static instance: AudioAppBrowserWebSocketManager | null = null;

    private constructor(url: string) {
        super(url);
    }

    static getInstance(): AudioAppBrowserWebSocketManager {
        const url = getWSPath();
        if (!url) {
            throw new Error("WebSocket URL not set");
        }
        return this.instance ?? (this.instance = new AudioAppBrowserWebSocketManager(url));
    }
}

/**
 * The connection of the System Center panel. It is a class of its own so that the panel and the Audio page, which can be
 * open at the same time, each have a connection and do not share listeners (the same split as the UHN app has).
 */
export class AudioSystemBrowserWebSocketManager extends BrowserWebSocketManager<
    AudioAppActionPayloadRequestMap,
    AudioAppActionPayloadResponseMap
> {
    private static instance: AudioSystemBrowserWebSocketManager | null = null;

    private constructor(url: string) {
        super(url);
    }

    static getInstance(): AudioSystemBrowserWebSocketManager {
        const url = getWSPath();
        if (!url) {
            throw new Error("WebSocket URL not set");
        }
        return this.instance ?? (this.instance = new AudioSystemBrowserWebSocketManager(url));
    }
}

/** The connection of the health page, which UXP keeps open in the background (see AudioSystemBrowserWebSocketManager). */
export class AudioHealthBrowserWebSocketManager extends BrowserWebSocketManager<
    AudioAppActionPayloadRequestMap,
    AudioAppActionPayloadResponseMap
> {
    private static instance: AudioHealthBrowserWebSocketManager | null = null;

    private constructor(url: string) {
        super(url);
    }

    static getInstance(): AudioHealthBrowserWebSocketManager {
        const url = getWSPath();
        if (!url) {
            throw new Error("WebSocket URL not set");
        }
        return this.instance ?? (this.instance = new AudioHealthBrowserWebSocketManager(url));
    }
}

export const useAudioWebSocket = (listeners?: AudioAppWebSocketResponseListener, onError?: AudioAppErrorHandler) =>
    useWebSocket<AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap>(listeners, onError);
