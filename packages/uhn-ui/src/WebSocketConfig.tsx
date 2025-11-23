import { ReconnectDetails, ReconnectListener, ReconnectOverlay, WebSocketProvider } from "@uxp/ui-lib";



import { useCallback, useMemo, useRef, useState } from "react";

import { UHNAppActionPayloadRequestMap, UHNAppActionPayloadResponseMap } from "@uhn/common";

import { UHNAppBrowserWebSocketManager, UHNAppErrorHandler, UHNAppWebSocketResponseListener } from "./app/UHNAppBrowserWebSocketManager";
import { useAppDispatch } from "./app/store";
import { addTopicMessage, setTopicPattern } from "./features/topic-trace/topicTraceSlice";



type WebSocketConfigProps = {
    children: React.ReactNode;

};

export const WebSocketConfig: React.FC<WebSocketConfigProps> = ({ children }) => {

    //const [showErrorOverlay, setShowErrorOverlay] = useState(false);
    const [reconnectDetails, setReconnectDetails] = useState<ReconnectDetails | undefined>(undefined);
    
    const overlayTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dispatch = useAppDispatch();
    const ws = useMemo(() => UHNAppBrowserWebSocketManager.getInstance(), [])
    const uhnListeners: UHNAppWebSocketResponseListener = useMemo(() => ({
        "topic:message": (message) => dispatch(addTopicMessage(message.payload!)),
        "topic:subscribe": (message) => dispatch(setTopicPattern(message.payload?.topicPattern)),
        "topic:unsubscribe": (message) => dispatch(setTopicPattern(undefined)),
        
    } as UHNAppWebSocketResponseListener), []);

    const globalErrorHandler: UHNAppErrorHandler = useCallback((({ action, error, errorDetails }) => {
        console.error(`Error in WebSocket action ${action}`, error, errorDetails);
        //if (action === "uxp/remote_action" || action === "uxp/remote_connection") {
        //  setShowErrorOverlay(true);
        // }
    }) as UHNAppErrorHandler, [])

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

        <WebSocketProvider<UHNAppActionPayloadRequestMap, UHNAppActionPayloadResponseMap>
            wsInstance={ws} listeners={uhnListeners} onError={globalErrorHandler} reconnectListener={onReconnect}>
            {children}
        </WebSocketProvider>
    </>
}