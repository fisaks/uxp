import { RemoteAppListener, RemoteNavigationListener, UxpTheme } from "@uxp/ui-lib";
import React, { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { AudioBody } from "./AudioBody";
import { AudioAppBrowserWebSocketManager } from "./app/AudioBrowserWebSocketManager";
import { WebSocketConfig } from "./WebSocketConfig";
import { getBaseRoutePath } from "./config";

const getWebSocket = () => AudioAppBrowserWebSocketManager.getInstance();

const AudioApp: React.FC = () => {
    const basePath = useMemo(() => getBaseRoutePath(), []);

    return (
        <WebSocketConfig getWebSocket={getWebSocket}>
            <UxpTheme>
                <RemoteAppListener />
                <BrowserRouter basename={basePath}>
                    <RemoteNavigationListener locationRoot={basePath} />
                    <AudioBody />
                </BrowserRouter>
            </UxpTheme>
        </WebSocketConfig>
    );
};

export default AudioApp;
