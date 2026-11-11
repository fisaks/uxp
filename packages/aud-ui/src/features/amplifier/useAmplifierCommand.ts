import { AmplifierState, AudioAppActionPayloadRequestMap } from "@aud/common";
import { ErrorCodeMessageMap, WebSocketTimeoutError } from "@uxp/ui-lib";
import { useCallback, useEffect, useState } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { useAppDispatch } from "../../hooks";
import { errorText } from "../shared/errorText";
import { amplifierStateReceived } from "./amplifierSlice";

export type AmplifierCommandAction = Extract<keyof AudioAppActionPayloadRequestMap, `amplifier_set_${string}`>;
export type SendAmplifierCommand = <A extends AmplifierCommandAction>(
    action: A,
    payload: AudioAppActionPayloadRequestMap[A]
) => Promise<void>;

const ERROR_MESSAGES: ErrorCodeMessageMap = {
    DISCONNECTED: "The amplifier cannot be reached.",
    INVALID_STATE: "The amplifier did not accept the command. It may still be starting up.",
};

const ERROR_MS = 8000;

const errorMessage = (error: unknown): string => {
    if (error instanceof WebSocketTimeoutError) return "The amplifier did not answer in time.";
    return errorText(error, "The command could not be sent.", ERROR_MESSAGES);
};

/** Sends commands to the amplifier and keeps track of why one failed. The server sends them to the amplifier one at a time. */
export const useAmplifierCommand = () => {
    const { sendMessageAsync } = useAudioWebSocket();
    const dispatch = useAppDispatch();
    const [error, setError] = useState<string | undefined>(undefined);

    // A new message gets its own time, so one that comes while another is shown is not cut short.
    useEffect(() => {
        if (!error) return;
        const timer = setTimeout(() => setError(undefined), ERROR_MS);
        return () => clearTimeout(timer);
    }, [error]);

    const send: SendAmplifierCommand = useCallback(
        async (action, payload) => {
            setError(undefined);
            try {
                const response = await sendMessageAsync(action, payload);
                dispatch(amplifierStateReceived(response.payload as AmplifierState));
            } catch (e) {
                setError(errorMessage(e));
            }
        },
        [sendMessageAsync, dispatch]
    );

    const clearError = useCallback(() => setError(undefined), []);

    return { send, error, clearError };
};
