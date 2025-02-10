import { RemoteAppListener, UxpTheme } from "@uxp/ui-lib";
import React, { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { DemoBody } from "./DemoBody";
import { getBaseRoutePath } from "./config";


const DemoApp: React.FC = () => {
    const basePath = useMemo(() => getBaseRoutePath(), []);

    return (
        <UxpTheme>
            <RemoteAppListener />
            <BrowserRouter basename={basePath}>
                <DemoBody />
            </BrowserRouter>
        </UxpTheme>
    );
};

export default DemoApp;
