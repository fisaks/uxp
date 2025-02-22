
import { BrowserWebSocketManager, ErrorHandler, useWebSocket, WebSocketResponseListenerObj } from "@uxp/ui-lib";

import { DemoAppActionPayloadRequestMap, DemoAppActionPayloadResponseMap } from "@demo/common";
import { getWSPath } from "../config";


export type DemoAppWebSocketResponseListener = WebSocketResponseListenerObj<DemoAppActionPayloadResponseMap>
export type DemoAppErrorHandler = ErrorHandler<DemoAppActionPayloadRequestMap, DemoAppActionPayloadResponseMap>

export class DemoAppBrowserWebSocketManager extends BrowserWebSocketManager<DemoAppActionPayloadRequestMap, DemoAppActionPayloadResponseMap> {
    private static instance: DemoAppBrowserWebSocketManager | null = null;

    private constructor(url: string) {
        super(url);
    }

    static getInstance(): DemoAppBrowserWebSocketManager {
        const url = getWSPath();
        if (!url) {
            throw new Error("WebSocket URL not set");
        }
        if (!this.instance) {
            this.instance = new DemoAppBrowserWebSocketManager(url);
        }
        return this.instance;

    }
}


export const useDemoWebSocket = (listeners?: DemoAppWebSocketResponseListener, onError?: DemoAppErrorHandler) =>
    useWebSocket<DemoAppActionPayloadRequestMap, DemoAppActionPayloadResponseMap>(listeners, onError);
