
import { UhnSystemSnapshot, UhnSystemStatus } from "@uhn/common";
import { UxpTheme } from "@uxp/ui-lib";
import React, { useCallback, useMemo, useState } from "react";
import { UHNSystemErrorHandler, UHNSystemWebSocketResponseListener } from "./app/UHNSystemBrowserWebSocketManager";
import { SystemPanel } from "./features/system/SystemPanel";
import { SystemWebSocketConfig } from "./SystemWebSocketConfig";

const UHNSystem: React.FC = () => {

    const [uhnStatus, setUhnStatus] = useState<UhnSystemStatus | undefined>(undefined);
    const [uhnSnapshot, setUhnSnapshot] = useState<UhnSystemSnapshot | undefined>(undefined);
    const [subscribed, setSubscribed] = useState<boolean>(false);
    const [connectionError, setConnectionError] = useState<boolean>(false);
    const systemListeners: UHNSystemWebSocketResponseListener = useMemo(() => ({
        "uhn:system:status": (message) => {
            console.log("System Status", message);
            setUhnStatus(message.payload);
        },
        "uhn:system:snapshot": (message) => {
            console.log("System Snapshot", message);
            setUhnSnapshot(message.payload);
        },
        "uhn:subscribed": () => {
            console.log("System Subscribed");
            setConnectionError(false);
            setSubscribed(true);
        },
        "uhn:unsubscribed": () => {
            console.log("System Unsubscribed");
            setSubscribed(false);
        },
        "uxp/remote_action": (message) => { console.log("Remote Action", message); },
        "uxp/remote_connection": (message) => { console.log("Remote Connection", message); }

    } as UHNSystemWebSocketResponseListener), []);

    const errorHandler: UHNSystemErrorHandler = useCallback((({ action, error, errorDetails }) => {
        console.error(`Error in WebSocket action ${action}`, error, errorDetails);
        if (action === "uxp/remote_action" || action === "uxp/remote_connection") {
            setConnectionError(true);
        }
    }) as UHNSystemErrorHandler, [])
    return (
        <UxpTheme>
            <SystemWebSocketConfig uhnListeners={systemListeners} errorHandler={errorHandler}>
                <SystemPanel uhnStatus={uhnStatus} uhnSnapshot={uhnSnapshot} subscribed={subscribed} connectionError={connectionError} />
            </SystemWebSocketConfig>
        </UxpTheme>
    );
};

export default UHNSystem;