import { useEffect, useRef } from "react";
import { WebSocketContext } from "./WebSocketContext";
import WebSocketManager, { WebSocketEventHandler } from "./WebSocketManager";


interface WebSocketProviderProps<ClientActionPayloadMap, ServerActionPayloadMap extends { [K in keyof ServerActionPayloadMap]: ServerActionPayloadMap[K] }> {
    wsInstance: WebSocketManager<ClientActionPayloadMap, ServerActionPayloadMap>;
    listeners: {
        [Action in keyof ServerActionPayloadMap]: WebSocketEventHandler<Action, ServerActionPayloadMap>
    },
    children: React.ReactNode;
}

export const WebSocketProvider = <ClientActionPayloadMap, ServerActionPayloadMap>({
    wsInstance,
    listeners,
    
    children,
}: WebSocketProviderProps<ClientActionPayloadMap, ServerActionPayloadMap>) => {
    const eventHandlersAttached = useRef(false);

    useEffect(() => {
        wsInstance.connect();

        if (!eventHandlersAttached.current) {
            console.log("Attaching event handlers");
            eventHandlersAttached.current = true;
            Object.entries(listeners).forEach(([action, handler]) => {
                wsInstance.onMessage(action as keyof ServerActionPayloadMap, handler as WebSocketEventHandler<keyof ServerActionPayloadMap, ServerActionPayloadMap>);
            })
            /*listeners.forEach(({ action, handler }) => {
                wsInstance.onMessage(action, handler);
            });*/
        }

        return () => {
            console.log("DeAttaching event handlers");
            wsInstance.disconnect();
            eventHandlersAttached.current = false;
        };
    }, [wsInstance, listeners]);

    return <WebSocketContext.Provider value={{ wsInstance }}>
        {children}
    </WebSocketContext.Provider>
};

export default WebSocketProvider;
