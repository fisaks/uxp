import { AudioAppActionPayloadRequestMap, ChromecastState } from "@aud/common";
import { WebSocketTimeoutError } from "@uxp/ui-lib";
import { useCallback, useState } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { useAppDispatch } from "../../hooks";
import { errorText } from "../shared/errorText";
import { chromecastStateReceived } from "./chromecastSlice";

export type ChromecastCommandAction = Extract<keyof AudioAppActionPayloadRequestMap, `chromecast_${string}`>;
export type SendChromecastCommand = <A extends ChromecastCommandAction>(
    action: A,
    payload: AudioAppActionPayloadRequestMap[A]
) => Promise<boolean>;

const failureText = (error: unknown) =>
    error instanceof WebSocketTimeoutError ? "The Chromecast did not answer in time." : errorText(error, "The Chromecast could not do that.");

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
