import { nanoid } from "@reduxjs/toolkit";
import { createBinaryMessage, ErrorCodes, ErrorDetail, MAGIC_BINARY_PREFIX, WebSocketAction, WebSocketActionUnion, WebSocketMessage, WebSocketResponse } from "@uxp/common";


export type WebSocketResponseListenerObj<ActionPayloadResponseMap> = {
    [Action in WebSocketAction<ActionPayloadResponseMap>]?: WebSocketResponseEventHandler<Action, ActionPayloadResponseMap>;
}

export type WebSocketResponseListener<Action extends WebSocketAction<ActionPayloadMap>, ActionPayloadMap> = {
    action: Action;
    handler: WebSocketResponseEventHandler<Action, ActionPayloadMap>;
}
export type WebSocketResponseEventHandler<Action extends WebSocketAction<ActionPayloadMap>, ActionPayloadMap> =
    (message: WebSocketResponse<Action, ActionPayloadMap>, data?: Uint8Array) => void;

export class WebSocketTimeoutError<ActionPayloadRequestMap, ActionPayloadResponseMap> extends Error {
    action: WebSocketActionUnion<ActionPayloadRequestMap, ActionPayloadResponseMap>;
    timeoutMs: number;

    constructor(action: WebSocketActionUnion<ActionPayloadRequestMap, ActionPayloadResponseMap>, timeoutMs: number) {
        super(`WebSocket request for '${action}' timed out after ${timeoutMs}ms`);
        this.name = "WebSocketTimeoutError";
        this.action = action;
        this.timeoutMs = timeoutMs;
    }
}

export class WebSocketError<ActionPayloadRequestMap, ActionPayloadResponseMap> extends Error {
    action: WebSocketActionUnion<ActionPayloadRequestMap, ActionPayloadResponseMap>
    error: ErrorDetail
    errorDetails?: object

    constructor(
        action: WebSocketActionUnion<ActionPayloadRequestMap, ActionPayloadResponseMap>,
        error: ErrorDetail,
        errorDetails?: object
    ) {
        super(`WebSocketError: ${error?.code}`);
        this.name = "WebSocketError";
        this.action = action;
        this.error = error;
        this.errorDetails = errorDetails;
    }
}

const INITIAL_RECONNECT_TIMEOUT = 1000;

export type ErrorHandlerProps<ActionPayloadRequestMap, ActionPayloadResponseMap> = {
    action: WebSocketActionUnion<ActionPayloadRequestMap, ActionPayloadResponseMap>;
    error: ErrorDetail;
    errorDetails?: object;
}
export type ErrorHandler<ActionPayloadRequestMap, ActionPayloadResponseMap> = (props: ErrorHandlerProps<ActionPayloadRequestMap, ActionPayloadResponseMap>) => boolean;

export class BrowserWebSocketManager<
    ActionPayloadRequestMap extends { [K in WebSocketAction<ActionPayloadRequestMap>]: ActionPayloadRequestMap[K] },
    ActionPayloadResponseMap extends { [K in WebSocketAction<ActionPayloadResponseMap>]: ActionPayloadResponseMap[K] }
> {
    private socket: WebSocket | null = null;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectTimeout: number = INITIAL_RECONNECT_TIMEOUT;
    private reconnectTimeoutId: NodeJS.Timeout | null = null;
    private isReconnecting = false;

    private eventHandlers: Map<
        WebSocketAction<ActionPayloadResponseMap>,
        WebSocketResponseEventHandler<WebSocketAction<ActionPayloadResponseMap>, ActionPayloadResponseMap>[]
    > = new Map();

    private pendingRequests = new Map<string, {
        action: WebSocketAction<ActionPayloadRequestMap>,
        resolve: (response: WebSocketResponse<WebSocketAction<ActionPayloadResponseMap>, ActionPayloadResponseMap> |
            WebSocketResponse<WebSocketAction<ActionPayloadRequestMap>, ActionPayloadRequestMap>
        ) => void
    }>();

    private errorHandlers: ErrorHandler<ActionPayloadRequestMap, ActionPayloadResponseMap>[] = [];
    private globalErrorHandler?: ErrorHandler<ActionPayloadRequestMap, ActionPayloadResponseMap>;


    protected constructor(protected url: string) { }

    connect() {
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
            console.warn("[WebSocket] Already connected, skipping.");
            return;
        }
        console.log(`[WebSocket] Connecting to ${this.url}...`);
        this.socket = new WebSocket(this.url);
        this.socket.binaryType = "arraybuffer";

        this.socket.onopen = () => {
            console.info(`[WebSocket] Connected: ${this.url}`);
            if (this.reconnectTimeoutId) {
                clearTimeout(this.reconnectTimeoutId);
                this.reconnectTimeoutId = null;
            }
            this.reconnectAttempts = 0;
            this.isConnected = true;
            this.isReconnecting = false;
            this.reconnectTimeout = INITIAL_RECONNECT_TIMEOUT;
        };

        this.socket.onmessage = (event) => {
            try {
                if (typeof event.data === "string") {
                    this.handleTextMessage(event.data);
                } else {
                    this.handleBinaryMessage(event.data);
                }
            } catch (error) {
                console.error("[WebSocket] Unexpected error processing message:", error);
            }
        };

        this.socket.onerror = (error) => {
            console.error("[WebSocket] Error:", error);
        };

        this.socket.onclose = (event) => {
            this.isConnected = false;
            if (event.code === 1000) {
                console.info("[WebSocket] closed normally. No reconnection needed.");
                return;
            }
            console.warn(`[WebSocket] Disconnected (code: ${event.code}, reason: ${event.reason || "Unknown"})`);
            this.reconnect();
        };
    }

    private handleError(
        action: WebSocketActionUnion<ActionPayloadRequestMap, ActionPayloadResponseMap>,
        error: ErrorDetail,
        errorDetails?: object) {
        console.error(`[WebSocket] Error in action "${action}":`, error);
        let isHandled = false;

        this.errorHandlers.forEach((handler) => {
            try {
                isHandled = handler({ action, error, errorDetails })
                if (isHandled) return;
            } catch (handlerError) {
                console.error(`[WebSocket] Error in handler for ${action}:`, handlerError);
            }
        })

        // If no component handled the error, propagate it to the global error handler
        if (!isHandled && this.globalErrorHandler) {
            this.globalErrorHandler({ action, error, errorDetails });
        }
    }

    private handleTextMessage(data: string) {
        try {
            console.info("[WebSocket Received text data");
            const message = JSON.parse(data) as WebSocketResponse<WebSocketAction<ActionPayloadResponseMap>, ActionPayloadResponseMap>;

            if (message.id && this.pendingRequests.has(message.id)) {
                this.pendingRequests.get(message.id)!.resolve(message);
                this.pendingRequests.delete(message.id);
                return;
            }


            if (!message.success && message.error) {
                this.handleError(message.action, message.error, message.errorDetails);
                return;
            }

            this.dispatchMessage(message);
        } catch (error) {
            console.error("[WebSocket] Error processing text message:", error);
        }
    }

    private handleBinaryMessage(data: ArrayBuffer) {
        try {
            const dataBuffer = new Uint8Array(data);
            if (dataBuffer.length < 8) {
                console.warn("[WebSocket] Received binary data but it's too short.");
                return;
            }

            const receivedPrefix = new TextDecoder("utf-8").decode(dataBuffer.slice(0, 4));
            if (receivedPrefix !== MAGIC_BINARY_PREFIX) {
                console.warn("[WebSocket] Received binary data with invalid prefix:", receivedPrefix);
                return;
            }
            console.info("[WebSocket] Received binary data", receivedPrefix);

            const headerLength = new DataView(dataBuffer.buffer).getUint32(4, false);
            const headerJson = new TextDecoder("utf-8").decode(dataBuffer.slice(8, 8 + headerLength));
            const header = JSON.parse(headerJson) as WebSocketResponse<WebSocketAction<ActionPayloadResponseMap>, ActionPayloadResponseMap>;

            if (!header.success && header.error) {
                this.handleError(header.action, header.error, header.errorDetails);
                return;
            }

            const binaryData = dataBuffer.slice(8 + headerLength);
            this.dispatchMessage(header, binaryData);
        } catch (error) {
            console.error("[WebSocket] Error processing binary message:", error);
        }
    }

    private dispatchMessage(
        message: WebSocketResponse<WebSocketAction<ActionPayloadResponseMap>, ActionPayloadResponseMap>,
        binaryData?: Uint8Array
    ) {
        const handlers = this.eventHandlers.get(message.action);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(message, binaryData);
                } catch (error) {
                    console.error(`[WebSocket] Error in handler for ${message.action}:`, error);
                }
            });
        } else {
            console.warn("[WebSocket] No handlers for WebSocket action:", message.action);
        }
    }



    private reconnect() {
        if (this.isReconnecting) {
            console.warn("[WebSocket] Reconnect already in progress, skipping.");
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("[WebSocket] Max reconnection attempts reached. Giving up.");
            return;
        }
        this.isReconnecting = true;
        const delay = Math.min(this.reconnectTimeout * 2 ** this.reconnectAttempts, 30000);
        console.log(`[WebSocket] Reconnecting in ${delay / 1000} seconds...`);

        this.reconnectAttempts++;

        this.reconnectTimeoutId = setTimeout(() => {
            this.connect();
        }, delay);
    }

    sendMessage<Action extends WebSocketAction<ActionPayloadRequestMap>>
        (message: WebSocketMessage<Action, ActionPayloadRequestMap>) {

        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            console.warn("[WebSocket] not connected. Unable to send message.");
        }
    }

    sendMessageAsync<Action extends WebSocketAction<ActionPayloadRequestMap>>(
        message: WebSocketMessage<Action, ActionPayloadRequestMap>,
        timeoutMs: number = 15000
    ): Promise<WebSocketResponse<WebSocketAction<ActionPayloadResponseMap>, ActionPayloadResponseMap> |
        WebSocketResponse<WebSocketAction<ActionPayloadRequestMap>, ActionPayloadRequestMap>> {

        if (!this.isConnected) {
            return Promise.reject(new Error("WebSocket not connected"));
        }

        return new Promise((resolve, reject) => {
            const id = nanoid();

            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new WebSocketTimeoutError<ActionPayloadRequestMap, ActionPayloadResponseMap>
                        (message.action, timeoutMs));
                }
            }, timeoutMs);

            this.pendingRequests.set(id, {
                action: message.action,
                resolve: (response) => {
                    clearTimeout(timeout); // Cancel timeout when response is received

                    if (response.success) {
                        resolve(response);
                    } else {
                        reject(new WebSocketError<ActionPayloadRequestMap, ActionPayloadResponseMap>(
                            response.action, response.error ? response.error : { code: "INTERNAL_SERVER_ERROR" }, response.errorDetails))
                    }
                }

            });

            this.sendMessage({ ...message, id });
        });
    }


    sendBinaryData<Action extends WebSocketAction<ActionPayloadRequestMap>>
        (message: WebSocketMessage<Action, ActionPayloadRequestMap>, data: Uint8Array) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            const messageBuffer = createBinaryMessage(message, data);
            this.socket.send(messageBuffer);
        } else {
            console.warn("[WebSocket] not connected. Unable to send message.");
        }
    }


    onMessage<Action extends WebSocketAction<ActionPayloadResponseMap>>(action: Action,
        handler: WebSocketResponseEventHandler<WebSocketAction<ActionPayloadResponseMap>, ActionPayloadResponseMap>) {
        console.log("[WebSocketManager] Added handler for", action);
        if (!this.eventHandlers.has(action as Action)) {
            this.eventHandlers.set(action as Action, []);
        }
        (this.eventHandlers.get(action as Action))!.push(handler);

    }

    offMessage<Action extends WebSocketAction<ActionPayloadResponseMap>>(
        action: Action,
        handler?: WebSocketResponseEventHandler<WebSocketAction<ActionPayloadResponseMap>, ActionPayloadResponseMap>
    ) {

        const handlers = this.eventHandlers.get(action);
        if (!handlers) return;
        if (!handler) {
            this.eventHandlers.delete(action);
            return;
        }

        const filteredHandlers = handlers.filter(h => h !== handler);
        if (filteredHandlers.length !== handlers.length) console.log("[WebSocketManager] Removing handler for", action);
        if (filteredHandlers.length > 0) {

            this.eventHandlers.set(action, filteredHandlers);
        } else {
            this.eventHandlers.delete(action);
        }

    }

    offAllMessages() {
        this.eventHandlers.clear();
    }

    disconnect() {
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId)
            this.reconnectTimeoutId = null;
        }
        this.socket?.close(1000, "Client disconnected.");
        this.socket = null;
        this.eventHandlers.clear();
        this.isConnected = false;
        this.isReconnecting = false
        this.reconnectAttempts = 0;
        this.pendingRequests.forEach((o, id) => {
            o.resolve({
                action: o.action,
                id,
                success: false,
                error: { code: ErrorCodes.DISCONNECTED }
            });
        });
        this.pendingRequests.clear();

    }

    setGlobalErrorHandler(handler: ErrorHandler<ActionPayloadRequestMap, ActionPayloadResponseMap> | undefined) {
        this.globalErrorHandler = handler;
    }

    onError(handler: ErrorHandler<ActionPayloadRequestMap, ActionPayloadResponseMap>) {
        if (!this.errorHandlers.includes(handler)) {
            this.errorHandlers.push(handler);
        }
    }

    offError(handler: ErrorHandler<ActionPayloadRequestMap, ActionPayloadResponseMap>) {
        this.errorHandlers = this.errorHandlers.filter((h) => h !== handler);
    }

    getConnectionStatus() {
        return this.isConnected;
    }


}



