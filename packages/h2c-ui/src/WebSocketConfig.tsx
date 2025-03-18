import { WebSocketProvider } from "@uxp/ui-lib";



import { useCallback, useMemo } from "react";

import { useAppDispatch } from "./hooks";
import { H2CAppBrowserWebSocketManager, H2CAppErrorHandler, H2CAppWebSocketResponseListener } from "./app/H2CAppBrowserWebSocketManager";
import { H2CAppActionPayloadRequestMap, H2CAppActionPayloadResponseMap } from "@h2c/common";



type WebSocketConfigProps = {
    children: React.ReactNode;

};

export const WebSocketConfig: React.FC<WebSocketConfigProps> = ({ children }) => {
    const dispatch = useAppDispatch();

    const ws = useMemo(() => H2CAppBrowserWebSocketManager.getInstance(), [])

    const demoListeners: H2CAppWebSocketResponseListener = useMemo(() => ({
        
        //binary_response: (message, data) => { console.log("Binary response", message.payload, data) }
    } as H2CAppWebSocketResponseListener), [dispatch]);

    const globalErrorHandler: H2CAppErrorHandler = useCallback((({ action, error, errorDetails }) => {
        console.error(`Error in WebSocket action ${action}`, error, errorDetails);
    }) as H2CAppErrorHandler, [])

    return <WebSocketProvider<H2CAppActionPayloadRequestMap, H2CAppActionPayloadResponseMap>
        wsInstance={ws} listeners={demoListeners} onError={globalErrorHandler}>
        {children}
    </WebSocketProvider>
}