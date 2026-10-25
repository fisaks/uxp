import { RemoteAppListener, RemoteNavigationListener, UxpTheme } from "@uxp/ui-lib";
import React, { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { AudioBody } from "./AudioBody";
import { WebSocketConfig } from "./WebSocketConfig";
import { getBaseRoutePath } from "./config";

const AudioApp: React.FC = () => {
    const basePath = useMemo(() => getBaseRoutePath(), []);

    return (
        <WebSocketConfig>
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
