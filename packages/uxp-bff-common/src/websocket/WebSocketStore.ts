import { WebSocket } from "ws";

import { AppLogger, RequestMetaData } from "../utils/AppLogger";
import { Token } from "../types/token.types";

export type WebSocketDetails = {
    socket: WebSocket,
    user?: Token
    requestMeta: RequestMetaData
}

export class WebSocketStore {
    private static instance: WebSocketStore;
    private connectedUsers = new Map<WebSocket, WebSocketDetails>();
    private topics = new Map<string, Set<WebSocket>>(); // Room name -> Set of WebSockets


    private constructor() {
    } // Private constructor to enforce singleton

    public static getInstance(): WebSocketStore {
        if (!WebSocketStore.instance) {
            WebSocketStore.instance = new WebSocketStore();
        }
        return WebSocketStore.instance;
    }

    public addUser(socket: WebSocket, details: WebSocketDetails) {
        this.connectedUsers.set(socket, details);
    }

    public removeUser(socket: WebSocket) {
        this.connectedUsers.delete(socket);
    }

    public getConnectedUsers(): Map<WebSocket, WebSocketDetails> {
        return this.connectedUsers;
    }

    public broadcastToUsers(userUuid: string[], action: string, payload: unknown) {
        for (const [, details] of this.connectedUsers) {
            if (details.socket.readyState === WebSocket.OPEN) {
                if (details.user?.uuid && userUuid.includes(details.user?.uuid)) {
                    details.socket.send(JSON.stringify({ action, payload, success: true }));
                }
            }
        }
    }

    public broadcast(action: string, payload: unknown) {
        for (const [, details] of this.connectedUsers) {
            if (details.socket.readyState === WebSocket.OPEN) {
                details.socket.send(JSON.stringify({ action, payload, success: true }));
            }
        }
    }

    public joinTopic(socket: WebSocket, topic: string) {
        if (!this.topics.has(topic)) {
            this.topics.set(topic, new Set());
        }
        this.topics.get(topic)!.add(socket);
    }

    public leaveTopic(socket: WebSocket, topic: string) {
        if (this.topics.has(topic)) {
            this.topics.get(topic)!.delete(socket);
            if (this.topics.get(topic)!.size === 0) {
                this.topics.delete(topic); // Remove empty room
            }
        }
    }

    public leaveAllTopics(socket: WebSocket) {
        for (const topic of this.topics.keys()) {
            this.leaveTopic(socket, topic);
        }
    }

    public broadcastToTopic<Action extends string, Payload = unknown>(topic: string, action: Action, payload: Payload) {
        if (this.topics.has(topic)) {
            for (const socket of this.topics.get(topic)!) {
                if (socket.readyState === WebSocket.OPEN) {
                    AppLogger.info(undefined, { message: `Broadcasting to topic: ${socket}` });
                    socket.send(JSON.stringify({ action, payload, success: true }));
                }
            }
        }
    }
}
