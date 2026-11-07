import { AudioAppActionPayloadRequestMap, ChromecastState } from "@aud/common";
import { WebSocketError, WebSocketTimeoutError } from "@uxp/ui-lib";
import { useCallback, useState } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { useAppDispatch } from "../../hooks";
import { chromecastStateReceived } from "./chromecastSlice";

export type ChromecastCommandAction = Extract<keyof AudioAppActionPayloadRequestMap, `chromecast_${string}`>;
export type SendChromecastCommand = <A extends ChromecastCommandAction>(
    action: A,
    payload: AudioAppActionPayloadRequestMap[A]
) => Promise<boolean>;

/** The server explains a command that does not fit, such as one the running app does not support. */
const failureText = (error: unknown) => {
    if (error instanceof WebSocketTimeoutError) return "The Chromecast did not answer in time.";
    if (error instanceof WebSocketError && error.error.message && error.error.code !== "DISCONNECTED") return error.error.message;
    return "The Chromecast could not do that.";
};

/** Sends commands to the Chromecast and keeps track of why one failed. The answer is the new state of the Chromecast. */
export const useChromecastCommand = () => {
    const { sendMessageAsync } = useAudioWebSocket();
    const dispatch = useAppDispatch();
    const [error, setError] = useState<string | undefined>(undefined);

    const send: SendChromecastCommand = useCallback(
        async (action, payload) => {
            setError(undefined);
            try {
                const response = await sendMessageAsync(action, payload);
                dispatch(chromecastStateReceived(response.payload as ChromecastState));
                return true;
            } catch (e) {
                setError(failureText(e));
                return false;
            }
        },
        [sendMessageAsync, dispatch]
    );

    const clearError = useCallback(() => setError(undefined), []);

    return { send, error, clearError };
};
