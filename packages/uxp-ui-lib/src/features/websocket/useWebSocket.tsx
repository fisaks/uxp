import { useCallback } from "react";
import { useWebSocketContext } from "./WebSocketContext";

export const useWebSocket = <ClientActionPayloadMap, ServerActionPayloadMap>() => {
    const wsInstance = useWebSocketContext<ClientActionPayloadMap, ServerActionPayloadMap>();

    const sendMessage = useCallback(<A extends keyof ClientActionPayloadMap>
        (action: A, payload: ClientActionPayloadMap[A], id?: string) => {
        wsInstance.sendMessage(action, payload, id);
    },
        [wsInstance]
    );

    return {
        sendMessage,
        getConnectionStatus: wsInstance.getConnectionStatus,
    };
};

export default useWebSocket;
