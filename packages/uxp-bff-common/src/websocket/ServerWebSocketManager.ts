import { WebSocket } from "ws";

import { createBinaryMessage, GenericActionPayloadMap, WebSocketResponse } from "@uxp/common";
import { Token } from "../types/token.types";
import { AppLogger, RequestMetaData } from "../utils/AppLogger";
import { sendWebSocketMessage } from "./websocketUtils";

export type WebSocketDetails = {
    socket: WebSocket,
    user?: Token
    requestMeta: RequestMetaData
}

export type GenericServerWebSocketManager = ServerWebSocketManager<GenericActionPayloadMap, GenericActionPayloadMap>;

export class ServerWebSocketManager<
    ActionPayloadRequestMap extends { [K in keyof ActionPayloadRequestMap]: ActionPayloadRequestMap[K] },
    ActionPayloadResponseMap extends { [K in keyof ActionPayloadResponseMap]: ActionPayloadResponseMap[K] }
> {

    protected connectedUsers = new Map<WebSocket, WebSocketDetails>();
    protected topics = new Map<string, Set<WebSocket>>(); // Room name -> Set of WebSockets

    protected constructor() {
    }


    public addUser(socket: WebSocket, details: WebSocketDetails) {
        this.connectedUsers.set(socket, details);
    }

    public removeUser(socket: WebSocket) {
        this.connectedUsers.delete(socket);
        this.leaveAllTopics(socket);
    }

    public getConnectedUsers(): Map<WebSocket, WebSocketDetails> {
        return this.connectedUsers;
    }

    public joinTopic(socket: WebSocket, topic: string) {
        if (!this.topics.has(topic)) {
            this.topics.set(topic, new Set());
        }
        this.topics.get(topic)!.add(socket);
    }

    public leaveTopic(socket: WebSocket, topic: string) {
        const topicSockets = this.topics.get(topic);
        if (topicSockets) {
            topicSockets.delete(socket);
            if (topicSockets.size === 0) {
                this.topics.delete(topic); // Remove empty room
            }
        }
    }

    public leaveAllTopics(socket: WebSocket) {

        for (const topic of [...this.topics.keys()]) {
            this.leaveTopic(socket, topic);
        }
    }

    public broadcastToUsers<Action extends Extract<keyof ActionPayloadResponseMap, string>>
        (userUuid: string[], message: WebSocketResponse<Action, ActionPayloadResponseMap>) {
        const data = JSON.stringify(message);
        for (const [, details] of this.connectedUsers) {
            const { user, socket, requestMeta } = details;
            if (user && userUuid.includes(user.uuid)) {
                this.sendData(socket, data, requestMeta);
            }
        }
    }

    public broadcast<Action extends Extract<keyof ActionPayloadResponseMap, string>>
        (message: WebSocketResponse<Action, ActionPayloadResponseMap>) {
        const data = JSON.stringify(message);
        for (const [, details] of this.connectedUsers) {
            const { socket, requestMeta } = details
            this.sendData(socket, data, requestMeta);
        }
    }

    public broadcastToTopic<Action extends Extract<keyof ActionPayloadResponseMap, string>>
        (topic: string, message: WebSocketResponse<Action, ActionPayloadResponseMap>, requestMetaData?: RequestMetaData) {

        AppLogger.info(undefined, {
            message: `Broadcasting to topic '${topic}' (${this.topics.get(topic)?.size ?? 0} clients)`
        });
        const data = JSON.stringify(message);

        this.topics.get(topic)?.forEach((socket) => this.sendData(socket, data, requestMetaData));
    }

    public broadcastBinaryDataToTopic<Action extends Extract<keyof ActionPayloadResponseMap, string>>
        (topic: string, header: WebSocketResponse<Action, ActionPayloadResponseMap>, data: Uint8Array|Buffer, requestMetaData?: RequestMetaData) {

        AppLogger.info(undefined, {
            message: `Broadcasting binary to topic '${topic}' (${this.topics.get(topic)?.size ?? 0} clients)`
        });
        const messageBuffer = createBinaryMessage(header, data);
        this.topics.get(topic)?.forEach((socket) => this.sendData(socket, messageBuffer, requestMetaData));

    }

    public sendMessage<Action extends Extract<keyof ActionPayloadResponseMap, string>>
        (socket: WebSocket, message: WebSocketResponse<Action, ActionPayloadResponseMap>, requestMetaData?: RequestMetaData) {
        return this.sendData(socket, JSON.stringify(message), requestMetaData);
    }

    public sendBinaryData<Action extends Extract<keyof ActionPayloadResponseMap, string>>
        (socket: WebSocket, header: WebSocketResponse<Action, ActionPayloadResponseMap>, data: Uint8Array|Buffer, requestMetaData?: RequestMetaData) {
        const message = createBinaryMessage(header, data);
        return this.sendData(socket, message, requestMetaData);

    }
    private sendData(socket: WebSocket, data: string | Buffer | ArrayBufferLike, requestMetaData?: RequestMetaData) {
        return sendWebSocketMessage({
            socket,
            message: data,
            requestMetaData,
            onClosed: this.removeUser.bind(this), // Automatically remove closed sockets
        });

    }



}
