
import { UHNHealthActionPayloadRequestMap, UHNHealthActionPayloadResponseMap } from "@uhn/common";
import { WebSocketAction } from "@uxp/common";
import { BrowserWebSocketManager, ErrorHandler, SubscriptionOptions, useWebSocket, useWebSocketSubscription, WebSocketResponseListenerObj } from "@uxp/ui-lib";
import { getWSPath } from "../config";

export type UHNHealthWebSocketResponseListener = WebSocketResponseListenerObj<UHNHealthActionPayloadResponseMap>
export type UHNHealthErrorHandler = ErrorHandler<UHNHealthActionPayloadRequestMap, UHNHealthActionPayloadResponseMap>

export class UHNHealthWebSocketManager extends BrowserWebSocketManager<UHNHealthActionPayloadRequestMap, UHNHealthActionPayloadResponseMap> {
    private static instance: UHNHealthWebSocketManager | null = null;

    private constructor(url: string) {
        super(url);
    }

    static getInstance(): UHNHealthWebSocketManager {
        const url = getWSPath();
        if (!url) {
            throw new Error("WebSocket URL not set");
        }
        if (!this.instance) {
            this.instance = new UHNHealthWebSocketManager(url);
        }
        return this.instance;

    }
}


export const useUHNHealthWebSocket = (listeners?: UHNHealthWebSocketResponseListener, onError?: UHNHealthErrorHandler) =>
    useWebSocket<UHNHealthActionPayloadRequestMap, UHNHealthActionPayloadResponseMap>(listeners, onError);
export const useUHNHealthWebSocketSubscription = <A extends WebSocketAction<UHNHealthActionPayloadRequestMap>>(options: Omit<SubscriptionOptions<UHNHealthActionPayloadRequestMap, UHNHealthActionPayloadResponseMap, A>, "resubscribeOn">) =>
    useWebSocketSubscription<UHNHealthActionPayloadRequestMap, UHNHealthActionPayloadResponseMap, A>(options);