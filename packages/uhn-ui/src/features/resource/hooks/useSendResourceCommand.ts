import { UhnResourceCommand } from "@uhn/common";
import { WebSocketTimeoutError } from "@uxp/ui-lib";
import { useCallback } from "react";
import { useAppDispatch } from "../../../app/store";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { commandAcknowledged, commandFailed, commandStarted } from "../resourceCommandFeedbackSlice";

export function useSendResourceCommand(resourceId: string) {
    const dispatch = useAppDispatch();
    const { sendMessageAsync } = useUHNWebSocket();

    return useCallback(async (command: UhnResourceCommand) => {
        const startedAt = Date.now();
        dispatch(commandStarted({ resourceId, startedAt }));
        try {
            await sendMessageAsync("uhn:resource:command", {
                resourceId,
                command
            }, 2000);
            dispatch(commandAcknowledged({ resourceId, startedAt }));
        } catch (error) {
            if (error instanceof WebSocketTimeoutError) {
                dispatch(
                    commandFailed({
                        resourceId,
                        reason: "timeout",
                        error: "No confirmation received",
                    })
                );
            } else {
                dispatch(
                    commandFailed({
                        resourceId,
                        reason: "send_failed",
                        error: "Failed to send command",
                    })
                );
            }
        }
    }, [dispatch, sendMessageAsync, resourceId]);
}
