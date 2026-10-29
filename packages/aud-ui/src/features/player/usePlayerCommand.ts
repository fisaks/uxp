import { AudioAppActionPayloadRequestMap, PlayerState } from "@aud/common";
import { WebSocketTimeoutError } from "@uxp/ui-lib";
import { useCallback } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { useAppDispatch } from "../../hooks";
import { playerCommandFailed, playerStateReceived } from "./playerSlice";

export type PlayerCommandAction = Extract<keyof AudioAppActionPayloadRequestMap, `player_${string}`>;
export type SendPlayerCommand = <A extends PlayerCommandAction>(action: A, payload: AudioAppActionPayloadRequestMap[A]) => Promise<void>;

/** Sends a command to the player. The answer is the new state of the player, and a failure is shown by the error snackbar. */
export const usePlayerCommand = (): SendPlayerCommand => {
    const { sendMessageAsync } = useAudioWebSocket();
    const dispatch = useAppDispatch();

    return useCallback(
        async (action, payload) => {
            try {
                const response = await sendMessageAsync(action, payload);
                dispatch(playerStateReceived(response.payload as PlayerState));
            } catch (error) {
                dispatch(
                    playerCommandFailed(
                        error instanceof WebSocketTimeoutError ? "The player did not answer in time." : "The player could not do that."
                    )
                );
            }
        },
        [sendMessageAsync, dispatch]
    );
};
