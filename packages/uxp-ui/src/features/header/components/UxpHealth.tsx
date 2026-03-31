import React, { useCallback, useEffect, useMemo } from "react";
import { ReconnectDetails, WebSocketResponseEventHandler } from "@uxp/ui-lib";
import { UxpBrowserWebSocketManager, UxpActionPayloadResponseMap } from "../../../app/UxpBrowserWebSocketManager";
import { useAppDispatch } from "../../../hooks";
import { healthSnapshotReceived } from "../healthSlice";
import { WebSocketAction } from "@uxp/common";

type ResponseHandler = WebSocketResponseEventHandler<WebSocketAction<UxpActionPayloadResponseMap>, UxpActionPayloadResponseMap>;

export const UxpHealth: React.FC = () => {
    const dispatch = useAppDispatch();
    const ws = useMemo(() => UxpBrowserWebSocketManager.getInstance(), []);

    const sendSubscribe = useCallback(() => {
        ws.sendMessage({ action: "uxp:subscribe", payload: { patterns: ["health/*"] } });
    }, [ws]);

    useEffect(() => {
        const messageHandler: ResponseHandler = (message) => {
            if (message.payload && "appId" in message.payload) {
                dispatch(healthSnapshotReceived(message.payload));
            }
        };

        const connectHandler = () => {
            sendSubscribe();
        };

        const reconnectHandler = (details: ReconnectDetails) => {
            if (details.connected) {
                sendSubscribe();
            }
        };

        ws.onMessage("uxp:health:snapshot", messageHandler);
        ws.onConnect(connectHandler);
        ws.onReconnect(reconnectHandler);

        // If WS is already connected (another component called connect() earlier),
        // onConnect won't fire, so subscribe immediately.
        // If not yet connected, connect() will trigger onConnect which calls sendSubscribe.
        if (ws.getConnectionStatus()) {
            sendSubscribe();
        } else {
            ws.connect();
        }

        return () => {
            ws.offMessage("uxp:health:snapshot", messageHandler);
            ws.offConnect(connectHandler);
            ws.offReconnect(reconnectHandler);
        };
    }, [ws, dispatch, sendSubscribe]);

    return null;
};
