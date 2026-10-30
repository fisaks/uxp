import { AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap } from "@aud/common";
import { useCallback } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { useAppDispatch } from "../../hooks";
import { playerCommandFailed } from "../player/playerSlice";

export type PlaylistCommandAction = Extract<
    keyof AudioAppActionPayloadRequestMap,
    "playlist_create" | "playlist_rename" | "playlist_delete" | "playlist_add_tracks" | "playlist_remove_track" | "playlist_move_track"
>;
export type SendPlaylistCommand = <A extends PlaylistCommandAction>(
    action: A,
    payload: AudioAppActionPayloadRequestMap[A]
) => Promise<AudioAppActionPayloadResponseMap[A] | undefined>;

/** Changes a playlist. The answer is the playlist as it is now, or nothing when it failed, which the error snackbar then tells. */
export const usePlaylistCommand = (): SendPlaylistCommand => {
    const { sendMessageAsync } = useAudioWebSocket();
    const dispatch = useAppDispatch();

    return useCallback(
        async (action, payload) => {
            try {
                const response = await sendMessageAsync(action, payload);
                return response.payload as AudioAppActionPayloadResponseMap[typeof action];
            } catch {
                dispatch(playerCommandFailed("The playlist could not be changed."));
                return undefined;
            }
        },
        [sendMessageAsync, dispatch]
    );
};
