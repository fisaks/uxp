import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { playerNoticeShown, selectPlayerState } from "./playerSlice";
import { usePlayerCommand } from "./usePlayerCommand";

const countOf = (count: number) => `${count} ${count === 1 ? "track" : "tracks"}`;

/**
 * What the user does with the queue, with the message that says what happened. Where the queue it replaces or clears had
 * tracks, the message has Undo. Everything that starts music from a list goes through here, so that all of them behave the same.
 */
export const usePlayerActions = () => {
    const send = usePlayerCommand();
    const dispatch = useAppDispatch();
    const hadQueue = (useAppSelector(selectPlayerState)?.queue.length ?? 0) > 0;

    return useMemo(() => {
        const notify = (text: string, undo = false) => dispatch(playerNoticeShown({ text, undo }));
        return {
            /** Shows a message for a moment. */
            notify,
            /** Whether there is a queue, which decides if pressing a track plays it now or the list from it. */
            hadQueue,
            /** Replaces the queue with the tracks and plays from `startIndex`. */
            playTracks: async (trackIds: string[], startIndex?: number) => {
                if ((await send("player_play_tracks", { trackIds, startIndex })) && hadQueue) notify("Queue replaced", true);
            },
            /** The same with the tracks mixed. */
            shuffleTracks: async (trackIds: string[]) => {
                await send("player_set_shuffle", { on: true });
                if ((await send("player_play_tracks", { trackIds })) && hadQueue) notify("Queue replaced", true);
            },
            enqueue: async (trackIds: string[]) => {
                if (await send("player_enqueue", { trackIds })) notify(`Added ${countOf(trackIds.length)} to the queue`);
            },
            playNext: async (trackIds: string[]) => {
                if (await send("player_play_next", { trackIds }))
                    notify(trackIds.length === 1 ? "Plays next" : `${countOf(trackIds.length)} play next`);
            },
            /** Plays a track now and keeps the queue. */
            playNow: (trackId: string) => send("player_play_now", { trackId }),
            clear: async () => {
                if (await send("player_clear", {})) notify("Queue cleared", true);
            },
            undo: () => send("player_undo_queue", {}),
        };
    }, [send, dispatch, hadQueue]);
};
