import { ReconnectDetails, ReconnectListener, ReconnectOverlay, WebSocketProvider } from "@uxp/ui-lib";



import { useCallback, useMemo, useRef, useState } from "react";

import { H2CAppActionPayloadRequestMap, H2CAppActionPayloadResponseMap } from "@h2c/common";

import { H2CAppBrowserWebSocketManager, H2CAppErrorHandler, H2CAppWebSocketResponseListener } from "./app/H2CAppBrowserWebSocketManager";



type WebSocketConfigProps = {
    children: React.ReactNode;

};

export const WebSocketConfig: React.FC<WebSocketConfigProps> = ({ children }) => {

    //const [showErrorOverlay, setShowErrorOverlay] = useState(false);
    const [reconnectDetails, setReconnectDetails] = useState<ReconnectDetails | undefined>(undefined);
    const overlayTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const ws = useMemo(() => H2CAppBrowserWebSocketManager.getInstance(), [])

    const h2cListeners: H2CAppWebSocketResponseListener = useMemo(() => ({

    } as H2CAppWebSocketResponseListener), []);

    const globalErrorHandler: H2CAppErrorHandler = useCallback((({ action, error, errorDetails }) => {
        console.error(`Error in WebSocket action ${action}`, error, errorDetails);
        //if (action === "uxp/remote_action" || action === "uxp/remote_connection") {
        //  setShowErrorOverlay(true);
        // }
    }) as H2CAppErrorHandler, [])

    const onReconnect: ReconnectListener = useCallback((details: ReconnectDetails) => {
        console.log("WebSocket Reconnect", details);
        setReconnectDetails(details);

    }, [])


    const retry = useCallback(() => {
        ws.clearReconnectDetails();
        ws.connect();
    }, [ws])

    return <>
        <ReconnectOverlay details={reconnectDetails} onRetryNow={retry} />

        <WebSocketProvider<H2CAppActionPayloadRequestMap, H2CAppActionPayloadResponseMap>
            wsInstance={ws} listeners={h2cListeners} onError={globalErrorHandler} reconnectListener={onReconnect}>
            {children}
        </WebSocketProvider>
    </>
}