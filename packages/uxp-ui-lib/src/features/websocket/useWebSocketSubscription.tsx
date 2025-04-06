import { useEffect, useRef } from "react";

import { WebSocketAction } from "@uxp/common";
import { ReconnectListener } from "./BrowserWebSocketManager";
import { useWebSocketContext } from "./WebSocketContext";

export type SubscriptionOptions<ActionPayloadRequestMap, ActionPayloadResponseMap, A extends WebSocketAction<ActionPayloadRequestMap>> = {
    action: A; // e.g. "document:subscribe"
    payload: ActionPayloadRequestMap[A];
    resubscribeOn?: WebSocketAction<ActionPayloadResponseMap>[];
    unsubscribeAction?: WebSocketAction<ActionPayloadRequestMap>; // defaults to replacing ":subscribe" with ":unsubscribe"

};

export function useWebSocketSubscription<ActionPayloadRequestMap, ActionPayloadResponseMap, A extends WebSocketAction<ActionPayloadRequestMap>>(
    options: SubscriptionOptions<ActionPayloadRequestMap, ActionPayloadResponseMap, A>
) {
    const { action, payload, unsubscribeAction, resubscribeOn } = options;
    const wsInstance = useWebSocketContext<ActionPayloadRequestMap, ActionPayloadResponseMap>();

    const payloadRef = useRef(payload);
    payloadRef.current = payload;

    useEffect(() => {
        console.log("WebSocket Subscription", action, payload);
        wsInstance.sendMessage({ action, payload });

        const handleReconnect: ReconnectListener = (details) => {
            console.log("WebSocket Subscription Reconnect", action, payload);
            if (details.phase === "success") {
                setTimeout(() => {
                    wsInstance.sendMessage({ action: action, payload: payloadRef.current });
                }, 500);
            }
        };
        const handleReconnect2 = () => {
            console.log("WebSocket Subscription Reconnect2", action, payload);
            setTimeout(() => {
                wsInstance.sendMessage({ action: action, payload: payloadRef.current });
            }, 500);
        }

        wsInstance.onReconnect(handleReconnect);
        if (resubscribeOn) {
            resubscribeOn.forEach((action) => {
                wsInstance.onMessage(action, handleReconnect2);
            });
        }


        return () => {
            const unsub = unsubscribeAction ?? (action.toString().replace(":subscribe", ":unsubscribe") as WebSocketAction<ActionPayloadRequestMap>);
            console.log("WebSocket UnSubscription", action, payload);
            wsInstance.sendMessage({ action: unsub, payload });
            wsInstance.offReconnect(handleReconnect);
            if (resubscribeOn) {
                resubscribeOn.forEach((action) => {
                    wsInstance.offMessage(action, handleReconnect2);
                });
            }
        };
    }, [action, unsubscribeAction, resubscribeOn]);
}
