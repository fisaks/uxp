import { createSelector } from "@reduxjs/toolkit";
import { QueueTrack } from "@aud/common";
import { RootState } from "../../app/store";

const selectPlayerSliceState = (state: RootState) => state.player;

/** Missing until the server has sent the first state. */
export const selectPlayerState = createSelector([selectPlayerSliceState], (player) => player.state);

/** When the browser received the state, since the position in it moves on from that time while playing. */
export const selectPlayerReceivedAt = createSelector([selectPlayerSliceState], (player): number => player.receivedAt);

export const selectPlayerError = createSelector([selectPlayerSliceState], (player) => player.error);

export const selectPlayerNotice = createSelector([selectPlayerSliceState], (player) => player.notice);

const NO_TRACKS: QueueTrack[] = [];

/** The queue in the order it plays. */
export const selectQueue = createSelector([selectPlayerState], (state): QueueTrack[] => state?.queue ?? NO_TRACKS);

/** Whether there is a queue, which decides if pressing a track plays it now or the list from it. */
export const selectHasQueue = createSelector([selectQueue], (queue): boolean => queue.length > 0);

/** The track that is playing, paused or next in line, when there is one. */
export const selectCurrentTrack = createSelector([selectPlayerState], (state): QueueTrack | undefined =>
    state && state.currentIndex !== undefined ? state.queue[state.currentIndex] : undefined
);

export const selectCurrentTrackId = createSelector([selectCurrentTrack], (track) => track?.id);
