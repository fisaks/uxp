import { OnConnectListener, ReconnectDetails, ReconnectListener, ReconnectOverlay, WebSocketProvider } from "@uxp/ui-lib";



import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { UHNAppActionPayloadRequestMap, UHNAppActionPayloadResponseMap } from "@uhn/common";

import { UHNAppBrowserWebSocketManager, UHNAppErrorHandler, UHNAppWebSocketResponseListener } from "./app/UHNAppBrowserWebSocketManager";
import { useAppDispatch } from "./app/store";
import { resourcesLoaded } from "./features/resource/resourceSlice";
import { fullStateReceived, stateReceived } from "./features/runtime-state/runtimeStateSlice";
import { addTopicMessage, setTopicPattern } from "./features/topic-trace/topicTraceSlice";



type WebSocketConfigProps = {
    children: React.ReactNode;

};

export const WebSocketConfig: React.FC<WebSocketConfigProps> = ({ children }) => {

    //const [showErrorOverlay, setShowErrorOverlay] = useState(false);
    const [reconnectDetails, setReconnectDetails] = useState<ReconnectDetails | undefined>(undefined);

    const overlayTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const connected = useRef(false);
    const dispatch = useAppDispatch();
    const ws = useMemo(() => UHNAppBrowserWebSocketManager.getInstance(), [])
    const uhnListeners: UHNAppWebSocketResponseListener = useMemo(() => ({
        "topic:message": (message) => dispatch(addTopicMessage(message.payload!)),
        "topic:subscribe": (message) => dispatch(setTopicPattern(message.payload?.topicPattern)),
        "topic:unsubscribe": (message) => dispatch(setTopicPattern(undefined)),
        "uhn:resources": (message) => {
            if (message.payload) dispatch(resourcesLoaded({ response: message.payload, receivedAt: Date.now() }));
            console.log("Received uhn:resources", message.payload);
        },
        "uhn:state": (message) => {
            if (message.payload) dispatch(stateReceived({ response: message.payload }));
            console.log("Received uhn:state", message.payload);
        },
        "uhn:fullState": (message) => {
            if (message.payload) dispatch(fullStateReceived({ response: message.payload, receivedAt: Date.now() }));
            console.log("Received uhn:fullState", message.payload);
        },
        "uhn:subscribed": (message) => {
            console.log("Subscribed to UHN patterns", message.payload);
        },
        "uhn:unsubscribed": (message) => {
            console.log("Unsubscribed from UHN patterns", message.payload);
        }

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
    const onConnect: OnConnectListener = useCallback((details) => {
        console.log("WebSocket Connected", details);
        ws.sendMessage({ action: "uhn:subscribe", payload: { patterns: ["resource/*", "state/*"] } });
        connected.current = true;
    }, []);
    const retry = useCallback(() => {
        ws.clearReconnectDetails();
        ws.connect();
    }, [ws])

    useEffect(() => {
        console.log("WebSocketConfig mounted, subscribing to UHN patterns");
        return () => {
            ws.sendMessage({ action: "uhn:unsubscribe", payload: { patterns: ["resource/*", "state/*"] } });
            console.log("WebSocketConfig unmounted, unsubscribed from UHN patterns");
        }
    }, []);


    return <>
        <ReconnectOverlay details={reconnectDetails} onRetryNow={retry} />

        <WebSocketProvider<UHNAppActionPayloadRequestMap, UHNAppActionPayloadResponseMap>
            wsInstance={ws} listeners={uhnListeners} onError={globalErrorHandler} reconnectListener={onReconnect}
            onConnect={onConnect}>
            {children}
        </WebSocketProvider>
    </>
}