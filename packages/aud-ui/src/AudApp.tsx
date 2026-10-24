import { RemoteAppListener, RemoteNavigationListener, UxpTheme } from "@uxp/ui-lib";
import React, { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { AudBody } from "./AudBody";
import { getBaseRoutePath } from "./config";

const AudApp: React.FC = () => {
    const basePath = useMemo(() => getBaseRoutePath(), []);

    return (
        <UxpTheme>
            <RemoteAppListener />
            <BrowserRouter basename={basePath}>
                <RemoteNavigationListener locationRoot={basePath} />
                <AudBody />
            </BrowserRouter>
        </UxpTheme>
    );
};

export default AudApp;
