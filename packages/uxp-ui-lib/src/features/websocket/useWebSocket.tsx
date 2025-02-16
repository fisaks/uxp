import { useCallback } from "react";
import { useWebSocketContext } from "./WebSocketContext";

export const useWebSocket = <ClientActionPayloadMap, ServerActionPayloadMap>() => {
    const wsInstance = useWebSocketContext<ClientActionPayloadMap, ServerActionPayloadMap>();

    const sendMessage = useCallback(<A extends keyof ClientActionPayloadMap>
        (action: A, payload: ClientActionPayloadMap[A]) => {
        wsInstance.sendMessage(action, payload);
    }, [wsInstance]);

    const sendMessageAsync = useCallback(<A extends keyof ClientActionPayloadMap>
        (action: A, payload: ClientActionPayloadMap[A], timeoutMs?: number) => {
        return wsInstance.sendMessageAsync(action, payload, timeoutMs);
    }, [wsInstance]);

    return {
        sendMessage,
        sendMessageAsync,
        getConnectionStatus: wsInstance.getConnectionStatus,
    };
};

export default useWebSocket;
