
import { UHNSystemActionPayloadRequestMap, UHNSystemActionPayloadResponseMap } from "@uhn/common";
import { WebSocketAction } from "@uxp/common";
import { BrowserWebSocketManager, ErrorHandler, SubscriptionOptions, useWebSocket, useWebSocketSubscription, WebSocketResponseListenerObj } from "@uxp/ui-lib";
import { getWSPath } from "../config";

export type UHNSystemWebSocketResponseListener = WebSocketResponseListenerObj<UHNSystemActionPayloadResponseMap>
export type UHNSystemErrorHandler = ErrorHandler<UHNSystemActionPayloadRequestMap, UHNSystemActionPayloadResponseMap>

export class UHNSystemWebSocketManager extends BrowserWebSocketManager<UHNSystemActionPayloadRequestMap, UHNSystemActionPayloadResponseMap> {
    private static instance: UHNSystemWebSocketManager | null = null;

    private constructor(url: string) {
        super(url);
    }

    static getInstance(): UHNSystemWebSocketManager {
        const url = getWSPath();
        if (!url) {
            throw new Error("WebSocket URL not set");
        }
        if (!this.instance) {
            this.instance = new UHNSystemWebSocketManager(url);
        }
        return this.instance;

    }
}


export const useUHNSystemWebSocket = (listeners?: UHNSystemWebSocketResponseListener, onError?: UHNSystemErrorHandler) =>
    useWebSocket<UHNSystemActionPayloadRequestMap, UHNSystemActionPayloadResponseMap>(listeners, onError);
export const useUHNSystemWebSocketSubscription = <A extends WebSocketAction<UHNSystemActionPayloadRequestMap>>(options: Omit<SubscriptionOptions<UHNSystemActionPayloadRequestMap, UHNSystemActionPayloadResponseMap, A>, "resubscribeOn">) =>
    useWebSocketSubscription<UHNSystemActionPayloadRequestMap, UHNSystemActionPayloadResponseMap, A>(options);