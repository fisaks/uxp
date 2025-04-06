
import { H2CAppActionPayloadRequestMap, H2CAppActionPayloadResponseMap } from "@h2c/common";
import { WebSocketAction } from "@uxp/common";
import { BrowserWebSocketManager, ErrorHandler, SubscriptionOptions, useWebSocket, useWebSocketSubscription, WebSocketResponseListenerObj } from "@uxp/ui-lib";
import { getWSPath } from "../config";

export type H2CAppWebSocketResponseListener = WebSocketResponseListenerObj<H2CAppActionPayloadResponseMap>
export type H2CAppErrorHandler = ErrorHandler<H2CAppActionPayloadRequestMap, H2CAppActionPayloadResponseMap>

export class H2CAppBrowserWebSocketManager extends BrowserWebSocketManager<H2CAppActionPayloadRequestMap, H2CAppActionPayloadResponseMap> {
    private static instance: H2CAppBrowserWebSocketManager | null = null;

    private constructor(url: string) {
        super(url);
    }

    static getInstance(): H2CAppBrowserWebSocketManager {
        const url = getWSPath();
        if (!url) {
            throw new Error("WebSocket URL not set");
        }
        if (!this.instance) {
            this.instance = new H2CAppBrowserWebSocketManager(url);
        }
        return this.instance;

    }
}

export const useH2CWebSocket = (listeners?: H2CAppWebSocketResponseListener, onError?: H2CAppErrorHandler) =>
    useWebSocket<H2CAppActionPayloadRequestMap, H2CAppActionPayloadResponseMap>(listeners, onError);
export const useH2CWebSocketSubscription = <A extends WebSocketAction<H2CAppActionPayloadRequestMap>>(options: Omit<SubscriptionOptions<H2CAppActionPayloadRequestMap, H2CAppActionPayloadResponseMap, A>, "resubscribeOn">) =>
    useWebSocketSubscription<H2CAppActionPayloadRequestMap, H2CAppActionPayloadResponseMap, A>(options);
