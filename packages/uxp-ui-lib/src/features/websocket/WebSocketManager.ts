import { WebSocketMessage, WebSocketResponse } from "@uxp/common";


export type WebSocketMessageListener<Action extends keyof PayloadMap, PayloadMap> = {
    action: Action;
    handler: WebSocketEventHandler<Action, PayloadMap>;
}
export type WebSocketEventHandler<Action extends keyof PayloadMap, PayloadMap> = (message: WebSocketResponse<Action, PayloadMap>) => void;


export class WebSocketManager<ClientActionPayloadMap extends { [K in keyof ClientActionPayloadMap]: ClientActionPayloadMap[K] },
    ServerActionPayloadMap extends { [K in keyof ServerActionPayloadMap]: ServerActionPayloadMap[K] }> {
    protected socket: WebSocket | null = null;
    protected isConnected: boolean = false;
    protected reconnectAttempts: number = 0;
    protected maxReconnectAttempts: number = 5;
    protected reconnectTimeout: number = 1000;

    protected eventHandlers: Map<keyof ServerActionPayloadMap, WebSocketEventHandler<keyof ServerActionPayloadMap, ServerActionPayloadMap>[]> = new Map();

    protected constructor(protected url: string) { }

    connect() {
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
            console.warn("WebSocket already connected, skipping.");
            return;
        }

        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log("WebSocket connected:", this.url);
            this.reconnectAttempts = 0;
            this.isConnected = true;
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as WebSocketResponse<keyof ServerActionPayloadMap, ServerActionPayloadMap>;

                const handlers = this.eventHandlers.get(message.action);
                if (handlers) {
                    handlers.forEach(handler => handler(message));
                } else {
                    console.warn("No handlers for WebSocket action:", message.action);
                }
            } catch (error) {
                console.error("Error processing WebSocket message:", error);
            }
        };

        this.socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        this.socket.onclose = (event) => {
            console.warn(`WebSocket closed: ${event.reason || "Unknown reason"}, Code: ${event.code}`);
            this.isConnected = false;
            if (event.code === 1000) {
                console.log("WebSocket closed normally. No reconnection needed.");
                return;
            }

            this.reconnect();
        };
    }

    private reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("Max reconnection attempts reached. Giving up.");
            return;
        }

        const delay = Math.min(this.reconnectTimeout * 2 ** this.reconnectAttempts, 30000);
        console.log(`Reconnecting in ${delay / 1000} seconds...`);

        this.reconnectAttempts++;

        setTimeout(() => {
            this.connect();
        }, delay);
    }

    sendMessage<Action extends keyof ClientActionPayloadMap>(action: Action, payload: ClientActionPayloadMap[Action], id?: string) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ action, payload, id } as WebSocketMessage<Action, ClientActionPayloadMap>));
        } else {
            console.warn("WebSocket not connected. Unable to send message.");
        }
    }

    onMessage<Action extends keyof ServerActionPayloadMap>(action: Action,
        handler: (m: WebSocketResponse<Action, ServerActionPayloadMap>) => void) {
        if (!this.eventHandlers.has(action as Action)) {
            this.eventHandlers.set(action as Action, []);
        }
        (this.eventHandlers.get(action as Action) as WebSocketEventHandler<Action, ServerActionPayloadMap>[]).push(handler);
    }


    disconnect() {
        this.socket?.close(1000, "Client disconnected.");
        this.socket = null;
        this.eventHandlers.clear();
        this.isConnected = false;
    }

    getConnectionStatus() {
        return this.isConnected;
    }
}

export default WebSocketManager;
