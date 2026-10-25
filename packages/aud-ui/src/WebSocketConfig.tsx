import React from "react";
import { AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap } from "@aud/common";
import { OnConnectListener, ReconnectDetails, ReconnectListener, ReconnectOverlay, WebSocketProvider } from "@uxp/ui-lib";
import { useCallback, useMemo, useState } from "react";
import {
    AudioAppBrowserWebSocketManager,
    AudioAppErrorHandler,
    AudioAppWebSocketResponseListener,
} from "./app/AudioBrowserWebSocketManager";
import { amplifierStateReceived } from "./features/amplifier/amplifierSlice";
import { useAppDispatch } from "./hooks";

type WebSocketConfigProps = {
    children: React.ReactNode;
};

export const WebSocketConfig: React.FC<WebSocketConfigProps> = ({ children }) => {
    const dispatch = useAppDispatch();
    const [reconnectDetails, setReconnectDetails] = useState<ReconnectDetails | undefined>(undefined);
    const ws = useMemo(() => AudioAppBrowserWebSocketManager.getInstance(), []);

    const listeners: AudioAppWebSocketResponseListener = useMemo(
        () => ({
            amplifier_subscribe: (message) => {
                if (message.payload) dispatch(amplifierStateReceived(message.payload));
            },
            amplifier_state: (message) => {
                if (message.payload) dispatch(amplifierStateReceived(message.payload));
            },
        }),
        [dispatch]
    );

    const onError: AudioAppErrorHandler = useCallback(({ action, error, errorDetails }) => {
        console.error(`Error in WebSocket action ${action}`, error, errorDetails);
        return true;
    }, []);

    // onConnect fires on the initial connection and on every reconnect, and the server forgets subscriptions with the socket.
    const onConnect: OnConnectListener = useCallback(() => {
        // The subscription is delayed so the connection through the UXP proxy has settled (same as the UHN app).
        setTimeout(() => ws.sendMessage({ action: "amplifier_subscribe", payload: {} }), 500);
    }, [ws]);

    const onReconnect: ReconnectListener = useCallback((details) => setReconnectDetails(details), []);

    const retry = useCallback(() => {
        ws.clearReconnectDetails();
        ws.connect();
    }, [ws]);

    return (
        <>
            <ReconnectOverlay details={reconnectDetails} onRetryNow={retry} />
            <WebSocketProvider<AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap>
                wsInstance={ws}
                listeners={listeners}
                onError={onError}
                reconnectListener={onReconnect}
                onConnect={onConnect}
            >
                {children}
            </WebSocketProvider>
        </>
    );
};
