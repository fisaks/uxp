import { createContext, useContext } from "react";
import WebSocketManager from "./WebSocketManager";

interface WebSocketContextType<Action extends string, Payload> {
    wsInstance: WebSocketManager<Action, Payload>;
}

export const WebSocketContext = createContext<WebSocketContextType<any, any> | null>(null);

export const useWebSocketContext = <ClientActionPayloadMap, ServerActionPayloadMap>() => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error("useWebSocket must be used within a WebSocketProvider");
    }
    return context.wsInstance as WebSocketManager<ClientActionPayloadMap, ServerActionPayloadMap>;
};
