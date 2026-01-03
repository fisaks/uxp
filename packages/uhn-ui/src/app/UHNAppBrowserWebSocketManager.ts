
import { UHNAppActionPayloadRequestMap, UHNAppActionPayloadResponseMap } from "@uhn/common";
import { WebSocketAction } from "@uxp/common";
import { BrowserWebSocketManager, ErrorHandler, SubscriptionOptions, useWebSocket, useWebSocketSubscription, WebSocketResponseListenerObj } from "@uxp/ui-lib";
import { getWSPath } from "../config";

export type UHNAppWebSocketResponseListener = WebSocketResponseListenerObj<UHNAppActionPayloadResponseMap>
export type UHNAppErrorHandler = ErrorHandler<UHNAppActionPayloadRequestMap, UHNAppActionPayloadResponseMap>

export class UHNAppBrowserWebSocketManager extends BrowserWebSocketManager<UHNAppActionPayloadRequestMap, UHNAppActionPayloadResponseMap> {
    private static instance: UHNAppBrowserWebSocketManager | null = null;

    private constructor(url: string) {
        super(url);
    }

    static getInstance(): UHNAppBrowserWebSocketManager {
        const url = getWSPath();
        if (!url) {
            throw new Error("WebSocket URL not set");
        }
        if (!this.instance) {
            this.instance = new UHNAppBrowserWebSocketManager(url);
        }
        return this.instance;

    }
}

export const useUHNWebSocket = (listeners?: UHNAppWebSocketResponseListener, onError?: UHNAppErrorHandler) =>
    useWebSocket<UHNAppActionPayloadRequestMap, UHNAppActionPayloadResponseMap>(listeners, onError);
export const useUHNWebSocketSubscription = <A extends WebSocketAction<UHNAppActionPayloadRequestMap>>(options: Omit<SubscriptionOptions<UHNAppActionPayloadRequestMap, UHNAppActionPayloadResponseMap, A>, "resubscribeOn">) =>
    useWebSocketSubscription<UHNAppActionPayloadRequestMap, UHNAppActionPayloadResponseMap, A>(options);
