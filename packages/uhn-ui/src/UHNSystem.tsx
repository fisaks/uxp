
import { UhnSystemSnapshot, UhnSystemStatus } from "@uhn/common";
import { UxpTheme } from "@uxp/ui-lib";
import React, { useCallback, useMemo, useState } from "react";
import { UHNSystemErrorHandler, UHNSystemWebSocketResponseListener } from "./app/UHNSystemBrowserWebSocketManager";
import { SystemPanel } from "./features/system/SystemPanel";
import { SystemWebSocketConfig } from "./SystemWebSocketConfig";

const UHNSystem: React.FC = () => {

    const [uhnStatus, setUhnStatus] = useState<{
        seq: number;
        status: UhnSystemStatus | undefined
    } | undefined>(undefined);
    const [uhnSnapshot, setUhnSnapshot] = useState<UhnSystemSnapshot | undefined>(undefined);
    const systemListeners: UHNSystemWebSocketResponseListener = useMemo(() => ({
        "uhn:system:status": (message) => {
            console.log("System Status", message);
            setUhnStatus({
                seq: Date.now(),
                status: message.payload
            });
        },
        "uhn:system:snapshot": (message) => {
            console.log("System Snapshot", message);
            setUhnSnapshot(message.payload);
        },
        "uhn:system:subscribed": () => { console.log("System Subscribed"); },
        "uhn:system:unsubscribed": () => { console.log("System Unsubscribed"); },
        "uxp/remote_action": (message) => { console.log("Remote Action", message); },
        "uxp/remote_connection": (message) => { console.log("Remote Connection", message); }

    } as UHNSystemWebSocketResponseListener), []);

    const errorHandler: UHNSystemErrorHandler = useCallback((({ action, error, errorDetails }) => {
        console.error(`Error in WebSocket action ${action}`, error, errorDetails);
        //if (action === "uxp/remote_action" || action === "uxp/remote_connection") {
        //  setShowErrorOverlay(true);
        // }
    }) as UHNSystemErrorHandler, [])
    return (
        <UxpTheme>
            <SystemWebSocketConfig uhnListeners={systemListeners} errorHandler={errorHandler}>
                <SystemPanel uhnStatus={uhnStatus?.status} uhnSnapshot={uhnSnapshot} />
            </SystemWebSocketConfig>
        </UxpTheme>
    );
};

export default UHNSystem;