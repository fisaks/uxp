import { RemoteAppListener, UxpTheme } from "@uxp/ui-lib";
import React, { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { getBaseRoutePath } from "./config";
import { UHNBody } from "./UHNBody";
import { WebSocketConfig } from "./WebSocketConfig";

const UHNApp: React.FC = () => {
    const basePath = useMemo(() => getBaseRoutePath(), []);

    return (
        <UxpTheme>
            <WebSocketConfig>
                <RemoteAppListener />
                <BrowserRouter basename={basePath}>
                    <UHNBody />
                </BrowserRouter>
            </WebSocketConfig>
        </UxpTheme>
    );
};

export default UHNApp;