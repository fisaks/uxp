import { WebSocketProvider } from "@uxp/ui-lib";
import { CastSessionSnapshot } from "@vid/common";
import React, { useCallback, useMemo, useRef } from "react";
import {
    VideoAppBrowserWebSocketManager,
    VideoAppErrorHandler,
    VideoAppWebSocketResponseListener,
} from "../../app/VideoBrowserWebSocketManager";

type GroupFollowerProps = {
    groupId: string;
    /** The row of the group in each state that is pushed, undefined while the group has no row. `receivedAt` is epoch milliseconds. */
    onRow: (row: CastSessionSnapshot | undefined, receivedAt: number) => void;
};

/**
 * Listens to the state of the casts for the row of one group, for a player tab that plays along with it. The tab has no
 * other use of the connection, so this is all it subscribes to.
 */
export const GroupFollower: React.FC<GroupFollowerProps> = ({ groupId, onRow }) => {
    const ws = useMemo(() => VideoAppBrowserWebSocketManager.getInstance(), []);
    const latest = useRef(onRow);
    latest.current = onRow;

    const listeners: VideoAppWebSocketResponseListener = useMemo(() => {
        const received = (message: { payload?: { sessions: CastSessionSnapshot[] } }) => {
            if (message.payload)
                latest.current(
                    message.payload.sessions.find((session) => session.deviceId === groupId),
                    Date.now()
                );
        };
        return { cast_subscribe: received, cast_state: received };
    }, [groupId]);

    const onError: VideoAppErrorHandler = useCallback(({ action, error, errorDetails }) => {
        console.error(`Error in WebSocket action ${action}`, error, errorDetails);
        return true;
    }, []);

    // onConnect fires on the first connection and on every reconnect, and the server forgets subscriptions with the socket.
    const onConnect = useCallback(() => {
        setTimeout(() => ws.sendMessage({ action: "cast_subscribe", payload: {} }), 500);
    }, [ws]);

    return (
        <WebSocketProvider wsInstance={ws} listeners={listeners} onError={onError} onConnect={onConnect}>
            {null}
        </WebSocketProvider>
    );
};
