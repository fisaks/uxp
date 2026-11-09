import { BrowserWebSocketManager, WebSocketProvider } from "@uxp/ui-lib";
import { VideoAppActionPayloadRequestMap, VideoAppActionPayloadResponseMap } from "@vid/common";
import React, { useCallback, useMemo } from "react";
import {
    VideoAppBrowserWebSocketManager,
    VideoAppErrorHandler,
    VideoAppWebSocketResponseListener,
} from "../../app/VideoBrowserWebSocketManager";
import { useAppDispatch } from "../../hooks";
import { chromecastsReceived } from "../chromecast/chromecastSlice";
import { castStateReceived } from "./castSlice";

const getPageWebSocket = () => VideoAppBrowserWebSocketManager.getInstance();

type CastProviderProps = {
    /** The connection to use: the one of the page (default) or the one of the System Center panel. */
    getWebSocket?: () => BrowserWebSocketManager<VideoAppActionPayloadRequestMap, VideoAppActionPayloadResponseMap>;
    children: React.ReactNode;
};

/** Keeps the cast state and the state of the Chromecasts in the store live: the BFF pushes it over the WebSocket. */
export const CastProvider: React.FC<CastProviderProps> = ({ getWebSocket = getPageWebSocket, children }) => {
    const dispatch = useAppDispatch();
    const ws = useMemo(getWebSocket, [getWebSocket]);

    const listeners: VideoAppWebSocketResponseListener = useMemo(
        () => ({
            cast_subscribe: (message) => message.payload && dispatch(castStateReceived(message.payload)),
            cast_state: (message) => message.payload && dispatch(castStateReceived(message.payload)),
            chromecasts_subscribe: (message) => message.payload && dispatch(chromecastsReceived(message.payload)),
            chromecasts_state: (message) => message.payload && dispatch(chromecastsReceived(message.payload)),
        }),
        [dispatch]
    );

    const onError: VideoAppErrorHandler = useCallback(({ action, error, errorDetails }) => {
        console.error(`Error in WebSocket action ${action}`, error, errorDetails);
        return true;
    }, []);

    // onConnect fires on the first connection and on every reconnect, and the server forgets subscriptions with the socket.
    const onConnect = useCallback(() => {
        // Delayed so the connection through the UXP proxy has settled (same as the AUD app).
        setTimeout(() => {
            ws.sendMessage({ action: "cast_subscribe", payload: {} });
            ws.sendMessage({ action: "chromecasts_subscribe", payload: {} });
        }, 500);
    }, [ws]);

    return (
        <WebSocketProvider wsInstance={ws} listeners={listeners} onError={onError} onConnect={onConnect}>
            {children}
        </WebSocketProvider>
    );
};
