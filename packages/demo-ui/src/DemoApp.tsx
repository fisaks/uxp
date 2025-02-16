import { RemoteAppListener, UxpTheme } from "@uxp/ui-lib";
import React, { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { DemoBody } from "./DemoBody";
import { WebSocketConfig } from "./WebSocketConfig";
import { getBaseRoutePath } from "./config";


const DemoApp: React.FC = () => {
    const basePath = useMemo(() => getBaseRoutePath(), []);

    return (
        <WebSocketConfig>
            <UxpTheme>
                <RemoteAppListener />
                <BrowserRouter basename={basePath}>
                    <DemoBody />
                </BrowserRouter>
            </UxpTheme>
        </WebSocketConfig>
    );
};

export default DemoApp;
