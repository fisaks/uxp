import { AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap } from "@aud/common";
import { WebSocketError } from "@uxp/ui-lib";
import { useCallback, useEffect, useState } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { useAppSelector } from "../../hooks";
import { selectConnected } from "../connection/connectionSlice";

/** The questions that are asked once and answered with a list or an item (the commands are sent by the player and playlist hooks). */
export type RequestAction = "library_get_artists" | "library_get_albums" | "library_get_tracks" | "playlist_list" | "playlist_get";

type RequestOptions = {
    /** False to wait with asking, for example until a dialog is open. */
    enabled?: boolean;
};

/**
 * Asks the server once the connection is ready, and again after a reconnect. `reload` asks again, for example to follow
 * a scan that is running, and `setData` replaces the answer with a newer one that a command has returned.
 */
export const useRequest = <A extends RequestAction>(
    action: A,
    payload: AudioAppActionPayloadRequestMap[A],
    { enabled = true }: RequestOptions = {}
) => {
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
            setError(e instanceof WebSocketError && e.error.code === "NOT_FOUND" ? "Not found." : "It could not be read.");
        }
    }, [sendMessageAsync, action, payloadKey]);

    useEffect(() => {
        if (connected && enabled) void reload();
    }, [connected, enabled, reload]);

    return { data, error, reload, setData };
};
