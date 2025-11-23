import { AppLogger, RequestMetaData } from "@uxp/bff-common";
import { FastifyRequest } from "fastify";
import { WebSocket } from "ws";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

export class TopicService {

    private requestMeta: RequestMetaData;
    private wsManager = UHNAppServerWebSocketManager.getInstance();
    constructor(requestMeta: FastifyRequest | RequestMetaData) {
        this.requestMeta = AppLogger.extractMetadata(requestMeta, true)!;

    }

    async subscribeToTopicPattern(socket: WebSocket, topicPattern: string) {

        this.wsManager.subscribeToTopicPattern(socket, topicPattern);
        return;
    }

    async unsubscribeFromTopicPattern(socket: WebSocket, topicPattern: string) {
        this.wsManager.unsubscribeFromTopicPattern(socket, topicPattern);
    }

}