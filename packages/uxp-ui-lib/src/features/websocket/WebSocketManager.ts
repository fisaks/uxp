import { nanoid } from "@reduxjs/toolkit";
import { ErrorCodes, WebSocketMessage, WebSocketResponse } from "@uxp/common";


export type WebSocketMessageListener<Action extends keyof PayloadMap, PayloadMap> = {
    action: Action;
    handler: WebSocketEventHandler<Action, PayloadMap>;
}
export type WebSocketEventHandler<Action extends keyof PayloadMap, PayloadMap> = (message: WebSocketResponse<Action, PayloadMap>) => void;

export class WebSocketTimeoutError<Action extends string = string> extends Error {
    action: Action;
    timeoutMs: number;

    constructor(action: Action, timeoutMs: number) {
        super(`WebSocket request for '${action}' timed out after ${timeoutMs}ms`);
        this.name = "WebSocketTimeoutError";
        this.action = action;
        this.timeoutMs = timeoutMs;
    }
}


const INITIAL_RECONNECT_TIMEOUT = 1000;
export class WebSocketManager<ClientActionPayloadMap extends { [K in keyof ClientActionPayloadMap]: ClientActionPayloadMap[K] },
    ServerActionPayloadMap extends { [K in keyof ServerActionPayloadMap]: ServerActionPayloadMap[K] }> {
    protected socket: WebSocket | null = null;
    protected isConnected: boolean = false;
    protected reconnectAttempts: number = 0;
    protected maxReconnectAttempts: number = 5;
    protected reconnectTimeout: number = INITIAL_RECONNECT_TIMEOUT;
    private reconnectTimeoutId: NodeJS.Timeout | null = null;
    private isReconnecting = false;
    protected eventHandlers: Map<keyof ServerActionPayloadMap, WebSocketEventHandler<keyof ServerActionPayloadMap, ServerActionPayloadMap>[]> = new Map();
    private pendingRequests = new Map<string, {
        action: keyof ServerActionPayloadMap,
        resolve: (response: WebSocketResponse<any, ServerActionPayloadMap>) => void
    }>();


    protected constructor(protected url: string) { }

    connect() {
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
            console.warn("[WebSocket] Already connected, skipping.");
            return;
        }
        console.log(`[WebSocket] Connecting to ${this.url}...`);
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.info(`[WebSocket] Connected: ${this.url}`);
            this.reconnectAttempts = 0;
            this.isConnected = true;
            this.isReconnecting = false;
            this.reconnectTimeout = INITIAL_RECONNECT_TIMEOUT;
            this.reconnectTimeoutId = null;
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as WebSocketResponse<keyof ServerActionPayloadMap, ServerActionPayloadMap>;

                if (message.id && this.pendingRequests.has(message.id)) {
                    this.pendingRequests.get(message.id)!.resolve(message);
                    this.pendingRequests.delete(message.id);
                    return;
                }
                const handlers = this.eventHandlers.get(message.action);
                if (handlers) {
                    handlers.forEach(handler => {
                        try {
                            handler(message);
                        } catch (error) {
                            console.error(`[WebSocket] Error in handler for ${String(message.action)}:`, error);
                        }
                    });
                } else {
                    console.warn("[WebSocket] No handlers for WebSocket action:", message.action);
                }
            } catch (error) {
                console.error("[WebSocket] Error processing message:", error);
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

    sendMessage<Action extends keyof ClientActionPayloadMap>(action: Action, payload: ClientActionPayloadMap[Action], id?: string) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ action, payload, id } as WebSocketMessage<Action, ClientActionPayloadMap>));
        } else {
            console.warn("[WebSocket] not connected. Unable to send message.");
        }
    }

    sendMessageAsync<Action extends keyof ClientActionPayloadMap>(
        action: Action,
        payload: ClientActionPayloadMap[Action],
        timeoutMs: number = 15000
    ): Promise<WebSocketResponse<Action, ServerActionPayloadMap>> {

        if (!this.isConnected) {
            return Promise.reject(new Error("WebSocket not connected"));
        }

        return new Promise((resolve, reject) => {
            const id = nanoid();

            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new WebSocketTimeoutError(String(action), timeoutMs));
                }
            }, timeoutMs);

            this.pendingRequests.set(id, {
                action: action,
                resolve: (response) => {
                    clearTimeout(timeout); // Cancel timeout when response is received
                    resolve(response);
                }
            });

            this.sendMessage(action, payload, id);
        });
    }

    onMessage<Action extends keyof ServerActionPayloadMap>(action: Action,
        handler: (m: WebSocketResponse<Action, ServerActionPayloadMap>) => void) {
        if (!this.eventHandlers.has(action as Action)) {
            this.eventHandlers.set(action as Action, []);
        }
        (this.eventHandlers.get(action as Action) as WebSocketEventHandler<Action, ServerActionPayloadMap>[]).push(handler);
    }

    offMessage<Action extends keyof ServerActionPayloadMap>(
        action: Action,
        handler?: WebSocketEventHandler<Action, ServerActionPayloadMap>
    ) {
        const handlers = this.eventHandlers.get(action);
        if (!handlers) return;
        if (!handler) {
            this.eventHandlers.delete(action);
            return;
        }

        const filteredHandlers = handlers.filter(h => h !== handler);
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
            o.resolve({ action: o.action, id, success: false, error: { code: ErrorCodes.DISCONNECTED } } as WebSocketResponse<any, ServerActionPayloadMap>);
        });
        this.pendingRequests.clear();

    }

    getConnectionStatus() {
        return this.isConnected;
    }
}

export default WebSocketManager;
