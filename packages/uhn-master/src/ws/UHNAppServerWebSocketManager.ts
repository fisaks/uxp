import { getMatchingResourcesForPattern, getMatchingStateForPattern, TopicMessagePayload, UHNAppActionPayloadRequestMap, UHNAppActionPayloadResponseMap, UHNAppResponseMessage, UhnFullStateResponse, UhnResourcesResponse, UhnStateResponse, UhnSubscriptionPattern } from "@uhn/common";
import { ServerWebSocketManager, topicMatches } from "@uxp/bff-common";

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

    public subscribeToUhnMessagePattern(socket: WebSocket, pattern: UhnSubscriptionPattern) {
        this.joinTopic(socket, `uhn:${pattern}`);
    }

    public unsubscribeFromUhnMessagePattern(socket: WebSocket, pattern: UhnSubscriptionPattern) {
        this.leaveTopic(socket, `uhn:${pattern}`);
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

    public broadcastResourcesMessage(payload: UhnResourcesResponse) {

        Array.from(this.topics.keys())
            .filter(t => t.startsWith("uhn:resource/"))
            .map(t => t.slice("uhn:".length))
            .forEach(resourceTopicPattern => {
                const matchingResources = getMatchingResourcesForPattern(
                    resourceTopicPattern,
                    payload.resources);

                this.broadcastToTopic(`uhn:${resourceTopicPattern}`, {
                    action: "uhn:resources",
                    success: true,
                    payload: {
                        resources: matchingResources
                    }
                });
            })
    }

    public broadcastRuntimeStateMessage(payload: UhnStateResponse) {

        Array.from(this.topics.keys())
            .filter(t => t.startsWith("uhn:state/"))
            .map(t => t.slice("uhn:".length))
            .forEach(stateTopicPattern => {
                const state = getMatchingStateForPattern(
                    stateTopicPattern,
                    [payload.state]) // payload contains only a single state, so wrap it in an array

                if (state.length === 1) {
                    this.broadcastToTopic(`uhn:${stateTopicPattern}`, {
                        action: "uhn:state",
                        success: true,
                        payload: {
                            state: state[0]
                        }
                    });
                }
            })
    }

    public broadcastRuntimeStatesMessage(payload: UhnFullStateResponse) {

        Array.from(this.topics.keys())
            .filter(t => t.startsWith("uhn:state/"))
            .map(t => t.slice("uhn:".length))
            .forEach(stateTopicPattern => {
                const states = getMatchingStateForPattern(
                    stateTopicPattern,
                    payload.states)

                this.broadcastToTopic(`uhn:${stateTopicPattern}`, {
                    action: "uhn:fullState",
                    success: true,
                    payload: {
                        states
                    }
                });

            })
    }

}

