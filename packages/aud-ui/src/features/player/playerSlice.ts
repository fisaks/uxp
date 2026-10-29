import { PlayerState } from "@aud/common";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";

type PlayerSliceState = {
    /** Missing until the server has sent the first state. */
    state?: PlayerState;
    /** When the browser received the state, since the position in it moves on from that time while playing. */
    receivedAt: number;
    /** Why the last command failed, until it is dismissed. */
    error?: string;
};

const playerSlice = createSlice({
    name: "player",
    initialState: { receivedAt: 0 } as PlayerSliceState,
    reducers: {
        playerStateReceived: {
            reducer(sliceState, action: PayloadAction<{ state: PlayerState; receivedAt: number }>) {
                sliceState.state = action.payload.state;
                sliceState.receivedAt = action.payload.receivedAt;
            },
            prepare: (state: PlayerState) => ({ payload: { state, receivedAt: Date.now() } }),
        },
        playerCommandFailed(sliceState, action: PayloadAction<string>) {
            sliceState.error = action.payload;
        },
        playerErrorDismissed(sliceState) {
            sliceState.error = undefined;
        },
    },
});

export const { playerStateReceived, playerCommandFailed, playerErrorDismissed } = playerSlice.actions;
export const selectPlayerState = (state: RootState) => state.player.state;
export const selectPlayerReceivedAt = (state: RootState) => state.player.receivedAt;
export const selectPlayerError = (state: RootState) => state.player.error;
export default playerSlice.reducer;
