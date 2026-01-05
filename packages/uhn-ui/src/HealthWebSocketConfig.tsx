import { OnConnectListener, ReconnectDetails, ReconnectListener, WebSocketProvider } from "@uxp/ui-lib";



import { useCallback, useMemo, useRef } from "react";

import { UHNHealthActionPayloadRequestMap, UHNHealthActionPayloadResponseMap } from "@uhn/common";

import { UHNHealthErrorHandler, UHNHealthWebSocketManager, UHNHealthWebSocketResponseListener } from "./app/UHNHealthBrowserWebSocketManager";



type HealthWebSocketConfig = {
    children?: React.ReactNode;
    uhnListeners: UHNHealthWebSocketResponseListener
    errorHandler: UHNHealthErrorHandler
};

export const HealthWebSocketConfig: React.FC<HealthWebSocketConfig> = ({ children, uhnListeners, errorHandler }) => {

    const connected = useRef(false);

    const ws = useMemo(() => UHNHealthWebSocketManager.getInstance(), [])
    const onReconnect: ReconnectListener = useCallback((details: ReconnectDetails) => {
        console.log("Health WebSocket Reconnect", details);

        if (details.connected) {
            ws.sendMessage({ action: "uhn:subscribe", payload: { patterns: ["health/*"] } });
            connected.current = true;
        } else {
            connected.current = false;
        }

    }, [])
    const onConnect: OnConnectListener = useCallback(() => {
        console.log("Health WebSocket Connected");
        // Delay subscription slightly to allow the underlying WebSocket connection/handshake
        // to fully settle before sending subscribe messages, avoiding intermittent race conditions.
        setTimeout(() => {
            ws.sendMessage({ action: "uhn:subscribe", payload: { patterns: ["health/*"] } });
            connected.current = true;
        }, 500);

    }, []);

    return <>
        <WebSocketProvider<UHNHealthActionPayloadRequestMap, UHNHealthActionPayloadResponseMap>
            wsInstance={ws}
            listeners={uhnListeners}
            onError={errorHandler}
            reconnectListener={onReconnect}
            onConnect={onConnect}>
            {children ? children : null}
        </WebSocketProvider>
    </>
}