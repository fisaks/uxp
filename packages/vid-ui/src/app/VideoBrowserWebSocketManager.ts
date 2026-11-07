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
