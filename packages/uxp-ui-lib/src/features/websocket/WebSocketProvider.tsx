import { WebSocketAction } from "@uxp/common";
import { useEffect, useRef } from "react";
import { BrowserWebSocketManager, ErrorHandler, WebSocketResponseEventHandler, WebSocketResponseListenerObj } from "./BrowserWebSocketManager";
import { WebSocketContext } from "./WebSocketContext";



interface WebSocketProviderProps<
    ActionPayloadRequestMap extends { [K in WebSocketAction<ActionPayloadRequestMap>]: ActionPayloadRequestMap[K] },
    ActionPayloadResponseMap extends { [K in WebSocketAction<ActionPayloadResponseMap>]: ActionPayloadResponseMap[K] }
> {
    wsInstance: BrowserWebSocketManager<ActionPayloadRequestMap, ActionPayloadResponseMap>;
    listeners: WebSocketResponseListenerObj<ActionPayloadResponseMap>
    onError: ErrorHandler<ActionPayloadRequestMap, ActionPayloadResponseMap>,
    children: React.ReactNode;
}

export const WebSocketProvider = <ActionPayloadRequestMap, ActionPayloadResponseMap>({
    wsInstance,
    listeners,
    onError,
    children,
}: WebSocketProviderProps<ActionPayloadRequestMap, ActionPayloadResponseMap>) => {
    const eventHandlersAttached = useRef(false);

    useEffect(() => {
        wsInstance.connect();
        if (!eventHandlersAttached.current) {
            eventHandlersAttached.current = true;
            console.info("[WebSocketProvider] Attaching event handlers");
            Object.entries(listeners).forEach(([action, handler]) => {
                wsInstance.onMessage(action as WebSocketAction<ActionPayloadResponseMap>,
                    handler as WebSocketResponseEventHandler<WebSocketAction<ActionPayloadResponseMap>, ActionPayloadResponseMap>);
            })
        }

        return () => {
            console.info("[WebSocketProvider] DeAttaching event handlers");
            Object.entries(listeners).forEach(([action, handler]) => {
                wsInstance.offMessage(action as WebSocketAction<ActionPayloadResponseMap>,
                    handler as WebSocketResponseEventHandler<WebSocketAction<ActionPayloadResponseMap>, ActionPayloadResponseMap>);
            });
            eventHandlersAttached.current = false;

            wsInstance.disconnect();
        };
    }, [wsInstance, listeners]);

    useEffect(() => {
        wsInstance.setGlobalErrorHandler(onError);
        return () => {
            wsInstance.setGlobalErrorHandler(undefined);
        };
    }, [wsInstance, onError]);

    return <WebSocketContext.Provider value={{ wsInstance }}>
        {children}
    </WebSocketContext.Provider>
};

export default WebSocketProvider;
