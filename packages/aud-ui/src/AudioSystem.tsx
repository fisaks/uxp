import { UxpTheme } from "@uxp/ui-lib";
import React from "react";
import { AudioSystemBrowserWebSocketManager } from "./app/AudioBrowserWebSocketManager";
import AmplifierPage from "./features/amplifier/AmplifierPage";
import { WebSocketConfig } from "./WebSocketConfig";

const getWebSocket = () => AudioSystemBrowserWebSocketManager.getInstance();

/** The Audio tab of the System Center: the controls used every day, in the narrow drawer. */
const AudioSystem: React.FC = () => (
    <UxpTheme>
        <WebSocketConfig getWebSocket={getWebSocket} reconnectOverlay={false}>
            <AmplifierPage compact />
        </WebSocketConfig>
    </UxpTheme>
);

export default AudioSystem;
