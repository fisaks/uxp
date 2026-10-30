import { AudioAppActionPayloadRequestMap, PlayerState } from "@aud/common";
import { WebSocketError, WebSocketTimeoutError } from "@uxp/ui-lib";
import { useCallback } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { useAppDispatch } from "../../hooks";
import { playerCommandFailed, playerStateReceived } from "./playerSlice";

export type PlayerCommandAction = Extract<keyof AudioAppActionPayloadRequestMap, `player_${string}`>;
/** Answers whether the command was done. */
export type SendPlayerCommand = <A extends PlayerCommandAction>(action: A, payload: AudioAppActionPayloadRequestMap[A]) => Promise<boolean>;

/** The server explains a command that does not fit the state of the player, such as changing the queue of an audiobook. */
const failureText = (error: unknown) => {
    if (error instanceof WebSocketTimeoutError) return "The player did not answer in time.";
    if (error instanceof WebSocketError && error.error.code === "INVALID_STATE" && error.error.message) return error.error.message;
    return "The player could not do that.";
};

/** Sends a command to the player. The answer is the new state of the player, and a failure is shown by the error snackbar. */
export const usePlayerCommand = (): SendPlayerCommand => {
    const { sendMessageAsync } = useAudioWebSocket();
    const dispatch = useAppDispatch();

    return useCallback(
        async (action, payload) => {
            try {
                const response = await sendMessageAsync(action, payload);
                dispatch(playerStateReceived(response.payload as PlayerState));
                return true;
            } catch (error) {
                dispatch(playerCommandFailed(failureText(error)));
                return false;
            }
        },
        [sendMessageAsync, dispatch]
    );
};
