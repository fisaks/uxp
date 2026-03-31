import { UxpHealthPayloadResponseMap, UxpHealthSnapshot, UxpSubscribePayloadRequestMap, UxpSubscribePayloadResponseMap, UxpSubscriptionPattern } from "@uxp/common";
import { ServerWebSocketManager } from "@uxp/bff-common";
import { WebSocket } from "ws";

type UxpActionPayloadRequestMap = UxpSubscribePayloadRequestMap;
type UxpActionPayloadResponseMap = UxpSubscribePayloadResponseMap & UxpHealthPayloadResponseMap;

export class UxpServerWebSocketManager extends ServerWebSocketManager<UxpActionPayloadRequestMap, UxpActionPayloadResponseMap> {
    private static instance: UxpServerWebSocketManager | null = null;

    private constructor() {
        super();
    }

    static getInstance(): UxpServerWebSocketManager {
        return this.instance ?? (this.instance = new UxpServerWebSocketManager());
    }

    public subscribeToPattern(socket: WebSocket, pattern: UxpSubscriptionPattern): void {
        this.joinTopic(socket, `uxp:${pattern}`);
    }

    public unsubscribeFromPattern(socket: WebSocket, pattern: UxpSubscriptionPattern): void {
        this.leaveTopic(socket, `uxp:${pattern}`);
    }

    public broadcastHealthSnapshot(snapshot: UxpHealthSnapshot): void {
        this.broadcastToTopic("uxp:health/*", {
            action: "uxp:health:snapshot",
            success: true,
            payload: snapshot,
        });
    }
}
