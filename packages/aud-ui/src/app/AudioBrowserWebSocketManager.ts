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

export const useAudioWebSocket = (listeners?: AudioAppWebSocketResponseListener, onError?: AudioAppErrorHandler) =>
    useWebSocket<AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap>(listeners, onError);
