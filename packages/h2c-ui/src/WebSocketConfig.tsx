import { GlobalErrorOverlay, ReconnectBanner, ReconnectDetails, ReconnectListener, WebSocketProvider } from "@uxp/ui-lib";



import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { H2CAppActionPayloadRequestMap, H2CAppActionPayloadResponseMap } from "@h2c/common";

import { H2CAppBrowserWebSocketManager, H2CAppErrorHandler, H2CAppWebSocketResponseListener } from "./app/H2CAppBrowserWebSocketManager";
import { useAppDispatch } from "./hooks";



type WebSocketConfigProps = {
    children: React.ReactNode;

};

export const WebSocketConfig: React.FC<WebSocketConfigProps> = ({ children }) => {

    const [showErrorOverlay, setShowErrorOverlay] = useState(false);
    const [reconnectDetails, setReconnectDetails] = useState<ReconnectDetails | undefined>(undefined);
    const overlayTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const ws = useMemo(() => H2CAppBrowserWebSocketManager.getInstance(), [])

    const h2cListeners: H2CAppWebSocketResponseListener = useMemo(() => ({
        "uxp/remote_connection": (message) => {
            if (!message.error) {
                setShowErrorOverlay(false);
            }
        }
        //binary_response: (message, data) => { console.log("Binary response", message.payload, data) }
    } as H2CAppWebSocketResponseListener), []);

    const globalErrorHandler: H2CAppErrorHandler = useCallback((({ action, error, errorDetails }) => {
        console.error(`Error in WebSocket action ${action}`, error, errorDetails);
        if (action === "uxp/remote_action" || action === "uxp/remote_connection") {
            setShowErrorOverlay(true);
        }
    }) as H2CAppErrorHandler, [])

    const onReconnect: ReconnectListener = useCallback((details: ReconnectDetails) => {
        console.log("WebSocket Reconnect", details);
        setReconnectDetails(details);

    }, [])

    useEffect(() => {
        if (reconnectDetails?.phase === "success" && showErrorOverlay) {
            if (overlayTimeout.current) clearTimeout(overlayTimeout.current);

            overlayTimeout.current = setTimeout(() => {
                setShowErrorOverlay(false);
                overlayTimeout.current = null;
            }, 10000);
        }

        return () => {
            if (overlayTimeout.current) {
                clearTimeout(overlayTimeout.current);
                overlayTimeout.current = null;
            }
        };
    }, [reconnectDetails, showErrorOverlay])

    const retry = useCallback(() => {
        ws.clearReconnectDetails();
        ws.connect();
    }, [ws])

    return <>
        {showErrorOverlay && (
            <GlobalErrorOverlay
                message={[
                    "We’re working to restore the connection to the backend server. ",
                    "This issue is not caused by your device or browser. ",
                    "The connection will recover automatically once the backend is reachable. ",
                    "You may reload the page manually if needed."
                ]}
                onRetry={() => window.location.reload()}
                onCancel={() => setShowErrorOverlay(false)}
            />
        )}
        {reconnectDetails && !showErrorOverlay && <ReconnectBanner details={reconnectDetails} onRetryNow={retry} />}

        <WebSocketProvider<H2CAppActionPayloadRequestMap, H2CAppActionPayloadResponseMap>
            wsInstance={ws} listeners={h2cListeners} onError={globalErrorHandler} reconnectListener={onReconnect}>
            {children}
        </WebSocketProvider>
    </>
}