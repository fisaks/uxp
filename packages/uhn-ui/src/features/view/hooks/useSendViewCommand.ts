import { UhnResourceCommand } from "@uhn/common";
import { useCallback } from "react";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";

/** Sends a resource command for view interactions.
 *  Unlike useSendResourceCommand, accepts resourceId dynamically
 *  to support onDeactivate targeting a different resource. */
export function useSendViewCommand() {
    const { sendMessageAsync } = useUHNWebSocket();

    return useCallback(async (resourceId: string, command: UhnResourceCommand) => {
        try {
            await sendMessageAsync("uhn:resource:command", {
                resourceId,
                command,
            }, 2000);
        } catch {
            // View commands are fire-and-forget for now.
            // Resource feedback (pending/acknowledged) is tracked per-resource
            // in the existing commandFeedback slice if needed later.
        }
    }, [sendMessageAsync]);
}
