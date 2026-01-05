import { WebSocketAction } from "@uxp/common";
import { useEffect, useRef } from "react";
import { BrowserWebSocketManager, ErrorHandler, OnConnectListener, ReconnectDetails, ReconnectListener, WebSocketResponseEventHandler, WebSocketResponseListenerObj } from "./BrowserWebSocketManager";
import { WebSocketContext } from "./WebSocketContext";




interface WebSocketProviderProps<
    ActionPayloadRequestMap extends { [K in WebSocketAction<ActionPayloadRequestMap>]: ActionPayloadRequestMap[K] },
    ActionPayloadResponseMap extends { [K in WebSocketAction<ActionPayloadResponseMap>]: ActionPayloadResponseMap[K] }
> {
    wsInstance: BrowserWebSocketManager<ActionPayloadRequestMap, ActionPayloadResponseMap>;
    listeners: WebSocketResponseListenerObj<ActionPayloadResponseMap>
    onError: ErrorHandler<ActionPayloadRequestMap, ActionPayloadResponseMap>,
    reconnectListener?: ReconnectListener;
    onConnect?: OnConnectListener;
    children: React.ReactNode;
}

export const WebSocketProvider = <ActionPayloadRequestMap, ActionPayloadResponseMap>({
    wsInstance,
    listeners,
    onError,
    reconnectListener,
    onConnect,
    children,
}: WebSocketProviderProps<ActionPayloadRequestMap, ActionPayloadResponseMap>) => {


    useEffect(() => {

        console.info("[WebSocketProvider] Attaching event handlers");
        Object.entries(listeners).forEach(([action, handler]) => {
            wsInstance.onMessage(action as WebSocketAction<ActionPayloadResponseMap>,
                handler as WebSocketResponseEventHandler<WebSocketAction<ActionPayloadResponseMap>, ActionPayloadResponseMap>);
        });

        wsInstance.connect();
        return () => {
            console.info("[WebSocketProvider] DeAttaching event handlers");
            Object.entries(listeners).forEach(([action, handler]) => {
                wsInstance.offMessage(action as WebSocketAction<ActionPayloadResponseMap>,
                    handler as WebSocketResponseEventHandler<WebSocketAction<ActionPayloadResponseMap>, ActionPayloadResponseMap>);
            });

        };
    }, [wsInstance, listeners]);

    useEffect(() => {
        wsInstance.setGlobalErrorHandler(onError);
        return () => {
            wsInstance.setGlobalErrorHandler(undefined);
        };
    }, [wsInstance, onError]);

    useEffect(() => {
        if (reconnectListener) {
            wsInstance.onReconnect(reconnectListener);
        }
        return () => {
            if (reconnectListener)
                wsInstance.offReconnect(reconnectListener)
        };
    }, [wsInstance, reconnectListener]);

    useEffect(() => {
        if (onConnect) {
            wsInstance.onConnect(onConnect);
        }
        return () => {
            if (onConnect)
                wsInstance.offConnect(onConnect)
        };
    }, [wsInstance, onConnect]);
    return <WebSocketContext.Provider value={{ wsInstance }}>
        {children}
    </WebSocketContext.Provider>
};

export default WebSocketProvider;
