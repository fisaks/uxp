import { TopicMessagePayload,  UHNAppActionPayloadRequestMap, UHNAppActionPayloadResponseMap, UHNAppResponseMessage } from "@uhn/common";
import { RequestMetaData, ServerWebSocketManager, topicMatches } from "@uxp/bff-common";

import { WebSocket } from "ws";

type BroadcastTopicMessage = {

    payload: TopicMessagePayload

}

export class UHNAppServerWebSocketManager extends ServerWebSocketManager<UHNAppActionPayloadRequestMap, UHNAppActionPayloadResponseMap> {
    private static instance: UHNAppServerWebSocketManager | null = null;

    private constructor() {
        super()
    }

    static getInstance(): UHNAppServerWebSocketManager {
        return this.instance ?? (this.instance = new UHNAppServerWebSocketManager());
    }

    public subscribeToTopicPattern(socket: WebSocket, topicName: string) {
        this.joinTopic(socket, `topic:${topicName}`);
    }

    public unsubscribeFromTopicPattern(socket: WebSocket, topicName: string) {
        this.leaveTopic(socket, `topic:${topicName}`);
    }
    
    public broadcastTopicMessage({ payload }: BroadcastTopicMessage) {
        const header: UHNAppResponseMessage<"topic:message"> = {
            action: "topic:message",
            success: true,
            payload: {
                topic: payload.topic,
                message: payload.message,
            },
        }
        Array.from(this.topics.keys())
            .filter(t =>
                t.startsWith("topic:") && topicMatches({ pattern: t.slice(6), topic: payload.topic }))
            .forEach(match => {
                this.broadcastToTopic(match, header);

            })

    }

}
