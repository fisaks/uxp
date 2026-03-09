import { useCallback } from "react";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";

/** Sends a scene activation command via WebSocket. */
export function useSendSceneCommand() {
    const { sendMessageAsync } = useUHNWebSocket();

    return useCallback(async (sceneId: string) => {
        try {
            await sendMessageAsync("uhn:scene:activate", { sceneId }, 2000);
        } catch {
            // Scene activation is fire-and-forget for now.
        }
    }, [sendMessageAsync]);
}
