import { configureUploadHandler, RemoteAppListener, UxpTheme } from "@uxp/ui-lib";
import React, { useEffect, useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { getBaseRoutePath } from "./config";
import { uploadAttachment } from "./features/upload/multipartUpload";
import { H2CBody } from "./H2CBody";
import { WebSocketConfig } from "./WebSocketConfig";

const H2CApp: React.FC = () => {
    const basePath = useMemo(() => getBaseRoutePath(), []);
    useEffect(() => {
        configureUploadHandler(uploadAttachment)
    }, []);
    return (
        <WebSocketConfig>
            <UxpTheme>
                <RemoteAppListener />

                <BrowserRouter basename={basePath}>
                    <H2CBody />
                </BrowserRouter>
            </UxpTheme>
        </WebSocketConfig>
    );
};

export default H2CApp;
