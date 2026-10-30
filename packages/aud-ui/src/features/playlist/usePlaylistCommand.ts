import { AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap } from "@aud/common";
import { useCallback } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { useAppDispatch } from "../../hooks";
import { playerCommandFailed } from "../player/playerSlice";
import { requestAnswered } from "../shared/requestCacheSlice";
import { requestKey } from "../shared/requestKey";

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
                // What the command answers is what the views of it show, so they do not have to ask again.
                if (action === "playlist_delete") {
                    dispatch(requestAnswered({ key: requestKey("playlist_list", {}), data: response.payload }));
                } else if (action !== "playlist_create") {
                    const { id } = payload as { id: string };
                    dispatch(requestAnswered({ key: requestKey("playlist_get", { id }), data: response.payload }));
                }
                return response.payload as AudioAppActionPayloadResponseMap[typeof action];
            } catch {
                dispatch(playerCommandFailed("The playlist could not be changed."));
                return undefined;
            }
        },
        [sendMessageAsync, dispatch]
    );
};
