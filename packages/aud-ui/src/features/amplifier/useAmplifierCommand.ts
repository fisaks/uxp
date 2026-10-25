import { AmplifierState, AudioAppActionPayloadRequestMap } from "@aud/common";
import { ErrorCodeMessageMap, mapApiErrorCodeToMessage, WebSocketError, WebSocketTimeoutError } from "@uxp/ui-lib";
import { useCallback, useState } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { useAppDispatch } from "../../hooks";
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

const errorMessage = (error: unknown): string => {
    if (error instanceof WebSocketError) {
        return mapApiErrorCodeToMessage(error.error.code, ERROR_MESSAGES);
    }
    if (error instanceof WebSocketTimeoutError) {
        return "The amplifier did not answer in time.";
    }
    return "The command could not be sent.";
};

/** Sends commands to the amplifier and keeps track of why one failed. The server sends them to the amplifier one at a time. */
export const useAmplifierCommand = () => {
    const { sendMessageAsync } = useAudioWebSocket();
    const dispatch = useAppDispatch();
    const [error, setError] = useState<string | undefined>(undefined);

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
