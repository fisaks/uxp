
import { getUxpWindow } from "@uxp/ui-lib";
import React, { useCallback, useMemo } from "react";
import { HealthWebSocketConfig } from "./HealthWebSocketConfig";
import { UHNHealthErrorHandler, UHNHealthWebSocketResponseListener } from "./app/UHNHealthBrowserWebSocketManager";

const UHNHealth: React.FC = () => {

    const healthListeners: UHNHealthWebSocketResponseListener = useMemo(() => ({
        "uhn:health:snapshot": (message) => {
            message.payload && getUxpWindow()?.signal.health(message.payload);
        },
        "uhn:subscribed": () => { console.log("Health Subscribed"); },
        "uhn:unsubscribed": () => { console.log("Health Unsubscribed"); },
        "uxp/remote_action": (message) => { console.log("Remote Action", message); },
        "uxp/remote_connection": (message) => { console.log("Remote Connection", message); }

    } as UHNHealthWebSocketResponseListener), []);

    const errorHandler: UHNHealthErrorHandler = useCallback((({ action, error, errorDetails }) => {
        console.error(`Error in WebSocket action ${action}`, error, errorDetails);
        //if (action === "uxp/remote_action" || action === "uxp/remote_connection") {
        //  setShowErrorOverlay(true);
        // }
    }) as UHNHealthErrorHandler, [])

    return (
        <HealthWebSocketConfig uhnListeners={healthListeners} errorHandler={errorHandler} />

    );
};

export default UHNHealth;