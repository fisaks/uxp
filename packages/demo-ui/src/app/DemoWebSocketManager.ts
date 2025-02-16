
import { ClientChatActionPayloadMap, ClientChatActions, ClientChatPayloads, ServerChatActionPayloadMap, ServerChatActions, ServerChatPayloads } from "@demo/common";
import { useWebSocket, WebSocketEventHandler, WebSocketManager, WebSocketMessageListener } from "@uxp/ui-lib";

import { getWSPath } from "../config";

export type DemoClientActions = ClientChatActions;
export type DemoClientPayloads = ClientChatPayloads;

export type DemoServerActions = ServerChatActions;
export type DemoServerPayloads = ServerChatPayloads;

export type DemoClientActionPayloadMap = ClientChatActionPayloadMap
export type DemoServerActionPayloadMap = ServerChatActionPayloadMap

export type DemoMessageListener = {
    [A in keyof DemoServerActionPayloadMap]: WebSocketEventHandler<A, DemoServerActionPayloadMap>
}

//export type DemoActions = DemoClientActions | DemoServerActions;
//export type DemoPayloads = ClientChatPayloads | ServerChatPayloads;



export class DemoWebSocketManager extends WebSocketManager<DemoClientActionPayloadMap, DemoServerActionPayloadMap> {
    private static instance: DemoWebSocketManager | null = null;

    private constructor(url: string) {
        super(url);
    }

    static getInstance(): DemoWebSocketManager {
        const url = getWSPath();
        if (!url) {
            throw new Error("WebSocket URL not set");
        }
        if (!this.instance) {
            this.instance = new DemoWebSocketManager(url);
        }
        return this.instance;

    }
}
export const useDemoWebSocket = () => useWebSocket<DemoClientActionPayloadMap, DemoServerActionPayloadMap>();
