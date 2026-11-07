import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";
import { selectAmplifierState } from "../amplifier/amplifierSelectors";

const selectChromecastSliceState = (state: RootState) => state.chromecast;

/** Missing until the server has sent the first state. */
export const selectChromecastState = createSelector([selectChromecastSliceState], (chromecast) => chromecast.state);

/** When the browser received the state, since the position in it moves on from that time while playing. */
export const selectChromecastReceivedAt = createSelector([selectChromecastSliceState], (chromecast): number => chromecast.receivedAt);

/** What the Chromecast plays, when it is reachable and an app has media. */
export const selectChromecastPlayback = createSelector([selectChromecastState], (state) => (state?.reachable ? state.playback : null));

/**
 * Whether what is heard is what the Chromecast plays: the amplifier is on the Chromecast input and the Chromecast has media.
 * The now playing surfaces then show the Chromecast instead of the player. False until the amplifier has been read.
 */
export const selectChromecastActive = createSelector(
    [selectAmplifierState, selectChromecastPlayback],
    (amplifier, playback): boolean =>
        playback !== null &&
        amplifier?.status !== undefined &&
        amplifier.info?.chromecastInput !== undefined &&
        amplifier.status.input === amplifier.info.chromecastInput
);
