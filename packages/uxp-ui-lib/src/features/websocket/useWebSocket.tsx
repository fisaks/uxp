import { WebSocketAction } from "@uxp/common";
import { useCallback, useEffect } from "react";
import { ErrorHandler, WebSocketResponseEventHandler, WebSocketResponseListenerObj } from "./BrowserWebSocketManager";
import { useWebSocketContext } from "./WebSocketContext";



export const useWebSocket = <ActionPayloadRequestMap, ActionPayloadResponseMap>(
    listeners?: WebSocketResponseListenerObj<ActionPayloadResponseMap>,
    onError?: ErrorHandler<ActionPayloadRequestMap, ActionPayloadResponseMap>) => {
    const wsInstance = useWebSocketContext<ActionPayloadRequestMap, ActionPayloadResponseMap>();

    useEffect(() => {
        if (listeners) {
            Object.entries(listeners).forEach(([action, handler]) => {
                wsInstance.onMessage(action as WebSocketAction<ActionPayloadResponseMap>,
                    handler as WebSocketResponseEventHandler<WebSocketAction<ActionPayloadResponseMap>, ActionPayloadResponseMap>);
            });
        }
        if (onError) {
            wsInstance.onError(onError);
        }

        return () => {
            if (listeners) {
                Object.entries(listeners).forEach(([action, handler]) => {
                    wsInstance.offMessage(action as WebSocketAction<ActionPayloadResponseMap>,
                        handler as WebSocketResponseEventHandler<WebSocketAction<ActionPayloadResponseMap>, ActionPayloadResponseMap>);
                });
            }
            if (onError) {
                wsInstance.offError(onError);
            }
        };
    }, [wsInstance, listeners, onError]);

    const sendMessage = useCallback(<A extends WebSocketAction<ActionPayloadRequestMap>>
        (action: A, payload: ActionPayloadRequestMap[A]) => {
        wsInstance.sendMessage({ action, payload });
    }, [wsInstance]);

    const sendMessageAsync = useCallback(<A extends WebSocketAction<ActionPayloadRequestMap>>
        (action: A, payload: ActionPayloadRequestMap[A], timeoutMs?: number) => {
        return wsInstance.sendMessageAsync({ action, payload }, timeoutMs);
    }, [wsInstance]);

    const sendBinaryMessage = useCallback(<A extends WebSocketAction<ActionPayloadRequestMap>>
        (action: A, payload: ActionPayloadRequestMap[A], data: Uint8Array) => {
        return wsInstance.sendBinaryData({ action, payload }, data);
    }, [wsInstance]);


    return {
        sendMessage,
        sendMessageAsync,
        sendBinaryMessage,
        getConnectionStatus: wsInstance.getConnectionStatus,
    };
};

export default useWebSocket;
