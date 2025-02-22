import { createContext, useContext } from "react";
import { BrowserWebSocketManager } from "./BrowserWebSocketManager";
import { WebSocketAction } from "@uxp/common";

interface WebSocketContextType<
    ActionPayloadRequestMap extends { [K in WebSocketAction<ActionPayloadRequestMap>]: ActionPayloadRequestMap[K] },
    ActionPayloadResponseMap extends { [K in WebSocketAction<ActionPayloadResponseMap>]: ActionPayloadResponseMap[K] }
> {
    wsInstance: BrowserWebSocketManager<ActionPayloadRequestMap, ActionPayloadResponseMap>;
}

export const WebSocketContext = createContext<WebSocketContextType<any, any> | undefined>(undefined);

export const useWebSocketContext = <
    ActionPayloadRequestMap extends { [K in WebSocketAction<ActionPayloadRequestMap>]: ActionPayloadRequestMap[K] },
    ActionPayloadResponseMap extends { [K in WebSocketAction<ActionPayloadResponseMap>]: ActionPayloadResponseMap[K] }
>() => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error("useWebSocketContext must be used within a WebSocketProvider");
    }
    return context.wsInstance as BrowserWebSocketManager<ActionPayloadRequestMap, ActionPayloadResponseMap>;
};
