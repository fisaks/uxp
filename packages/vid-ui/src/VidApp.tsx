import { RemoteAppListener, RemoteNavigationListener, UxpTheme } from "@uxp/ui-lib";
import React, { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { VidBody } from "./VidBody";
import { getBaseRoutePath } from "./config";

const VidApp: React.FC = () => {
    const basePath = useMemo(() => getBaseRoutePath(), []);

    return (
        <UxpTheme>
            <RemoteAppListener />
            <BrowserRouter basename={basePath}>
                <RemoteNavigationListener locationRoot={basePath} />
                <VidBody />
            </BrowserRouter>
        </UxpTheme>
    );
};

export default VidApp;
