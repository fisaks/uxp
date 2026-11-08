import { CastState, VideoAppActionPayloadRequestMap, VideoAppActionPayloadResponseMap } from "@vid/common";
import { BrowserWebSocketManager, WebSocketProvider } from "@uxp/ui-lib";
import axios from "axios";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { castPause, castPlay, castSeek, castStop, startCast } from "../../api/cast-api";
import { VideoAppBrowserWebSocketManager, VideoAppErrorHandler, VideoAppWebSocketResponseListener } from "../../app/VideoBrowserWebSocketManager";

type CastContextValue = {
    /** Undefined until the first state has arrived. */
    state: CastState | undefined;
    /** The text of the last command that failed. */
    error: string | undefined;
    clearError: () => void;
    start: (clipId: string, deviceIds: string[], positionSec?: number) => Promise<boolean>;
    play: (deviceId: string) => Promise<boolean>;
    pause: (deviceId: string) => Promise<boolean>;
    stop: (deviceId: string) => Promise<boolean>;
    seek: (deviceId: string, positionSec: number) => Promise<boolean>;
};

const CastContext = createContext<CastContextValue | undefined>(undefined);

export const useCast = () => {
    const value = useContext(CastContext);
    if (!value) throw new Error("useCast must be used within a CastProvider");
    return value;
};

const getPageWebSocket = () => VideoAppBrowserWebSocketManager.getInstance();

type CastProviderProps = {
    /** The connection to use: the one of the page (default) or the one of the System Center panel. */
    getWebSocket?: () => BrowserWebSocketManager<VideoAppActionPayloadRequestMap, VideoAppActionPayloadResponseMap>;
    children: React.ReactNode;
};

/** The casts of the page: live state from the BFF over the WebSocket, and the commands that change it. */
export const CastProvider: React.FC<CastProviderProps> = ({ getWebSocket = getPageWebSocket, children }) => {
    const ws = useMemo(getWebSocket, [getWebSocket]);
    const [state, setState] = useState<CastState | undefined>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);

    const listeners: VideoAppWebSocketResponseListener = useMemo(
        () => ({
            cast_subscribe: (message) => message.payload && setState(message.payload),
            cast_state: (message) => message.payload && setState(message.payload),
        }),
        []
    );

    const onError: VideoAppErrorHandler = useCallback(({ action, error, errorDetails }) => {
        console.error(`Error in WebSocket action ${action}`, error, errorDetails);
        return true;
    }, []);

    // onConnect fires on the first connection and on every reconnect, and the server forgets subscriptions with the socket.
    const onConnect = useCallback(() => {
        // Delayed so the connection through the UXP proxy has settled (same as the AUD app).
        setTimeout(() => ws.sendMessage({ action: "cast_subscribe", payload: {} }), 500);
    }, [ws]);

    const command = useCallback(async (run: () => Promise<CastState>) => {
        setError(undefined);
        try {
            setState(await run());
            return true;
        } catch (e) {
            setError((axios.isAxiosError(e) && e.response?.data?.message) || "The Chromecast could not do that.");
            return false;
        }
    }, []);

    const value = useMemo<CastContextValue>(
        () => ({
            state,
            error,
            clearError: () => setError(undefined),
            start: (clipId, deviceIds, positionSec) => command(() => startCast(clipId, deviceIds, positionSec)),
            play: (deviceId) => command(() => castPlay(deviceId)),
            pause: (deviceId) => command(() => castPause(deviceId)),
            stop: (deviceId) => command(() => castStop(deviceId)),
            seek: (deviceId, positionSec) => command(() => castSeek(deviceId, positionSec)),
        }),
        [state, error, command]
    );

    return (
        <WebSocketProvider wsInstance={ws} listeners={listeners} onError={onError} onConnect={onConnect}>
            <CastContext.Provider value={value}>{children}</CastContext.Provider>
        </WebSocketProvider>
    );
};
