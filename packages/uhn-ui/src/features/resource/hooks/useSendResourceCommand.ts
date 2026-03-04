import { ResourceStateValue, UhnResourceCommand } from "@uhn/common";
import { WebSocketTimeoutError } from "@uxp/ui-lib";
import { useCallback } from "react";
import { useAppDispatch } from "../../../app/store";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { commandFailed, commandStarted } from "../resourceCommandFeedbackSlice";

export function useSendResourceCommand(resourceId: string, currentValue?: ResourceStateValue) {
    const dispatch = useAppDispatch();
    const { sendMessageAsync } = useUHNWebSocket();

    return useCallback(async (command: UhnResourceCommand) => {
        // Skip pending/error feedback when the analog value isn't changing.
        // The command still sends (to guard against stale UI state), but since
        // the edge won't emit a state update for an unchanged value, the
        // feedback would stay stuck in "pending" forever.
        const isNoOp = command.type === "setAnalog" && command.value === currentValue;
        if (!isNoOp) {
            dispatch(commandStarted({ resourceId }));
        }
        try {
            await sendMessageAsync("uhn:resource:command", {
                resourceId,
                command
            }, 2000);
        } catch (error) {
            if (isNoOp) return;
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
    }, [dispatch, sendMessageAsync, resourceId, currentValue]);
}
