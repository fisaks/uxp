import React, { useCallback, useEffect, useMemo } from "react";
import { HealthWebSocketConfig } from "./HealthWebSocketConfig";
import { UHNHealthErrorHandler, UHNHealthWebSocketResponseListener, useUHNHealthWebSocket } from "./app/UHNHealthBrowserWebSocketManager";

const UHNHealth: React.FC = () => {

    const healthListeners: UHNHealthWebSocketResponseListener = useMemo(() => ({
        "uhn:health:snapshot": (message) => { console.log("Health Snapshot", message); },
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
        <HealthWebSocketConfig uhnListeners={healthListeners} errorHandler={errorHandler}>
            <Health />
        </HealthWebSocketConfig>

    );
};

const Health = () => {
    const { sendMessageAsync } = useUHNHealthWebSocket();
    useEffect(() => {
        // Example: Request a health snapshot on mount
        //sendMessageAsync("uhn:subscribe", { patterns: ["health/*"] });
    }, []);
    return null;
}

export default UHNHealth;