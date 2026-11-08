import { VideoAppActionPayloadRequestMap, VideoAppActionPayloadResponseMap } from "@vid/common";
import { BrowserWebSocketManager, ErrorHandler, WebSocketResponseListenerObj } from "@uxp/ui-lib";
import { getWSPath } from "../config";

export type VideoAppWebSocketResponseListener = WebSocketResponseListenerObj<VideoAppActionPayloadResponseMap>;
export type VideoAppErrorHandler = ErrorHandler<VideoAppActionPayloadRequestMap, VideoAppActionPayloadResponseMap>;

export class VideoAppBrowserWebSocketManager extends BrowserWebSocketManager<
    VideoAppActionPayloadRequestMap,
    VideoAppActionPayloadResponseMap
> {
    private static instance: VideoAppBrowserWebSocketManager | null = null;

    private constructor(url: string) {
        super(url);
    }

    static getInstance(): VideoAppBrowserWebSocketManager {
        const url = getWSPath();
        if (!url) {
            throw new Error("WebSocket URL not set");
        }
        return this.instance ?? (this.instance = new VideoAppBrowserWebSocketManager(url));
    }
}

/**
 * The connection of the System Center panel. It is a class of its own so that the panel and the video pages, which can be
 * open at the same time, each have a connection and do not share listeners.
 */
export class VideoSystemBrowserWebSocketManager extends BrowserWebSocketManager<
    VideoAppActionPayloadRequestMap,
    VideoAppActionPayloadResponseMap
> {
    private static instance: VideoSystemBrowserWebSocketManager | null = null;

    private constructor(url: string) {
        super(url);
    }

    static getInstance(): VideoSystemBrowserWebSocketManager {
        const url = getWSPath();
        if (!url) {
            throw new Error("WebSocket URL not set");
        }
        return this.instance ?? (this.instance = new VideoSystemBrowserWebSocketManager(url));
    }
}
