import React from "react";
import { AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap } from "@aud/common";
import {
    BrowserWebSocketManager,
    OnConnectListener,
    ReconnectDetails,
    ReconnectListener,
    ReconnectOverlay,
    WebSocketProvider,
} from "@uxp/ui-lib";
import { useCallback, useMemo, useState } from "react";
import { AudioAppErrorHandler, AudioAppWebSocketResponseListener } from "./app/AudioBrowserWebSocketManager";
import { amplifierStateReceived } from "./features/amplifier/amplifierSlice";
import { connectionLost, connectionReady } from "./features/connection/connectionSlice";
import { playerPositionReceived, playerStateReceived } from "./features/player/playerSlice";
import { contentChanged } from "./features/shared/requestCacheSlice";
import { useAppDispatch } from "./hooks";

type WebSocketConfigProps = {
    /** The connection to use: the one of the page or the one of the System Center panel. */
    getWebSocket: () => BrowserWebSocketManager<AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap>;
    /** The overlay covers the whole screen, so the System Center panel leaves it to the page. */
    reconnectOverlay?: boolean;
    children: React.ReactNode;
};

export const WebSocketConfig: React.FC<WebSocketConfigProps> = ({ getWebSocket, reconnectOverlay = true, children }) => {
    const dispatch = useAppDispatch();
    const [reconnectDetails, setReconnectDetails] = useState<ReconnectDetails | undefined>(undefined);
    const ws = useMemo(getWebSocket, [getWebSocket]);

    const listeners: AudioAppWebSocketResponseListener = useMemo(
        () => ({
            amplifier_subscribe: (message) => {
                if (message.payload) dispatch(amplifierStateReceived(message.payload));
            },
            amplifier_state: (message) => {
                if (message.payload) dispatch(amplifierStateReceived(message.payload));
            },
            player_subscribe: (message) => {
                if (message.payload) dispatch(playerStateReceived(message.payload));
            },
            library_changed: () => {
                dispatch(contentChanged("library"));
            },
            playlists_changed: () => {
                dispatch(contentChanged("playlists"));
            },
            history_changed: () => {
                dispatch(contentChanged("history"));
            },
            player_state: (message) => {
                if (message.payload) dispatch(playerStateReceived(message.payload));
            },
            player_position: (message) => {
                if (message.payload) dispatch(playerPositionReceived(message.payload.positionSec));
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
        // Messages are delayed so the connection through the UXP proxy has settled (same as the UHN app).
        setTimeout(() => {
            dispatch(connectionReady());
            ws.sendMessage({ action: "amplifier_subscribe", payload: {} });
            ws.sendMessage({ action: "player_subscribe", payload: {} });
            ws.sendMessage({ action: "content_subscribe", payload: {} });
        }, 500);
    }, [ws, dispatch]);

    const onReconnect: ReconnectListener = useCallback(
        (details) => {
            setReconnectDetails(details);
            if (!details.connected) dispatch(connectionLost());
        },
        [dispatch]
    );

    const retry = useCallback(() => {
        ws.clearReconnectDetails();
        ws.connect();
    }, [ws]);

    return (
        <>
            {reconnectOverlay && <ReconnectOverlay details={reconnectDetails} onRetryNow={retry} />}
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
