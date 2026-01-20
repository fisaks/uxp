import { OnConnectListener, ReconnectDetails, ReconnectListener, WebSocketProvider } from "@uxp/ui-lib";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { UHNSystemActionPayloadRequestMap, UHNSystemActionPayloadResponseMap } from "@uhn/common";
import { UHNSystemErrorHandler, UHNSystemWebSocketManager, UHNSystemWebSocketResponseListener } from "./app/UHNSystemBrowserWebSocketManager";


type SystemWebSocketConfig = {
    children?: React.ReactNode;
    uhnListeners: UHNSystemWebSocketResponseListener
    errorHandler: UHNSystemErrorHandler
};

export const SystemWebSocketConfig: React.FC<SystemWebSocketConfig> = ({ children, uhnListeners, errorHandler }) => {

    const connected = useRef(false);

    const ws = useMemo(() => UHNSystemWebSocketManager.getInstance(), [])
    const onReconnect: ReconnectListener = useCallback((details: ReconnectDetails) => {
        console.log("System WebSocket Reconnect", details);

        if (details.connected) {
            ws.sendMessage({ action: "uhn:subscribe", payload: { patterns: ["system/*"] } });
            connected.current = true;
        } else {
            connected.current = false;
        }

    }, [])
    const onConnect: OnConnectListener = useCallback(() => {
        console.log("System WebSocket Connected");
        // Delay subscription slightly to allow the underlying WebSocket connection/handshake
        // to fully settle before sending subscribe messages, avoiding intermittent race conditions.
        setTimeout(() => {
            ws.sendMessage({ action: "uhn:subscribe", payload: { patterns: ["system/*"] } });
            connected.current = true;
        }, 100);

    }, []);
    useEffect(() => {
        return () => {
            ws.sendMessage({ action: "uhn:unsubscribe", payload: { patterns: ["system/*"] } });
            connected.current = false;
        }
    }, [])
    return <>
        <WebSocketProvider<UHNSystemActionPayloadRequestMap, UHNSystemActionPayloadResponseMap>
            wsInstance={ws}
            listeners={uhnListeners}
            onError={errorHandler}
            reconnectListener={onReconnect}
            onConnect={onConnect}>
            {children ? children : null}
        </WebSocketProvider>
    </>
}