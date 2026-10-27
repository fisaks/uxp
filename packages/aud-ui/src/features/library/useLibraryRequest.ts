import { AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap } from "@aud/common";
import { WebSocketError } from "@uxp/ui-lib";
import { useCallback, useEffect, useState } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { useAppSelector } from "../../hooks";
import { selectConnected } from "../connection/connectionSlice";

export type LibraryAction = Extract<keyof AudioAppActionPayloadRequestMap, `library_${string}`>;

/**
 * Asks the server for a library list once the connection is ready, and again after a reconnect.
 * `reload` asks again, for example to follow a scan that is running.
 */
export const useLibraryRequest = <A extends LibraryAction>(action: A, payload: AudioAppActionPayloadRequestMap[A]) => {
    const { sendMessageAsync } = useAudioWebSocket();
    const connected = useAppSelector(selectConnected);
    const [data, setData] = useState<AudioAppActionPayloadResponseMap[A] | undefined>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);
    const payloadKey = JSON.stringify(payload);

    const reload = useCallback(async () => {
        try {
            const response = await sendMessageAsync(action, JSON.parse(payloadKey));
            setData(response.payload as AudioAppActionPayloadResponseMap[A]);
            setError(undefined);
        } catch (e) {
            setError(
                e instanceof WebSocketError && e.error.code === "NOT_FOUND" ? "Not found in the library." : "The library could not be read."
            );
        }
    }, [sendMessageAsync, action, payloadKey]);

    useEffect(() => {
        if (connected) void reload();
    }, [connected, reload]);

    return { data, error, reload };
};
