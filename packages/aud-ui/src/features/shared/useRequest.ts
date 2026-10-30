import { AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap } from "@aud/common";
import { WebSocketError } from "@uxp/ui-lib";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectConnected } from "../connection/connectionSelectors";
import { requestKey, RequestAction } from "./requestKey";
import { selectCachedAnswer, selectContentVersion } from "./requestCacheSelectors";
import { ContentTopic, requestAnswered } from "./requestCacheSlice";

const topicOf = (action: RequestAction): ContentTopic => (action.startsWith("library_") ? "library" : "playlists");

/**
 * Asks the server once the connection is ready, and again after a reconnect and when the server says that what is shown
 * has changed. The latest answer is kept, so a view that is opened again shows what it showed at once and is then brought
 * up to date. `reload` asks again, for example to follow a scan that is running, and `setData` replaces the answer with a
 * newer one that a command has returned.
 */
export const useRequest = <A extends RequestAction>(action: A, payload: AudioAppActionPayloadRequestMap[A]) => {
    type Answer = AudioAppActionPayloadResponseMap[A];
    const { sendMessageAsync } = useAudioWebSocket();
    const dispatch = useAppDispatch();
    const connected = useAppSelector(selectConnected);
    const payloadKey = JSON.stringify(payload);
    const key = requestKey(action, payload);
    const data = useAppSelector(useMemo(() => selectCachedAnswer(action, JSON.parse(payloadKey)), [action, payloadKey]));
    const contentVersion = useAppSelector(selectContentVersion[topicOf(action)]);
    const [error, setError] = useState<string | undefined>(undefined);

    const reload = useCallback(async () => {
        try {
            const response = await sendMessageAsync(action, JSON.parse(payloadKey));
            dispatch(requestAnswered({ key, data: response.payload }));
            setError(undefined);
        } catch (e) {
            setError(e instanceof WebSocketError && e.error.code === "NOT_FOUND" ? "Not found." : "It could not be read.");
        }
    }, [sendMessageAsync, dispatch, action, payloadKey, key]);

    useEffect(() => {
        if (connected) void reload();
    }, [connected, reload, contentVersion]);

    const setData = useCallback((answer: Answer) => dispatch(requestAnswered({ key, data: answer })), [dispatch, key]);

    // What is shown stays when asking again fails: an error is only reported when there is nothing to show.
    return { data, error: data === undefined ? error : undefined, reload, setData };
};
