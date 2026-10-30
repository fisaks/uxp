import { PlayerState } from "@aud/common";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type PlayerSliceState = {
    /** Missing until the server has sent the first state. */
    state?: PlayerState;
    /** When the browser received the state, since the position in it moves on from that time while playing. */
    receivedAt: number;
    /** Why the last command failed, until it is dismissed. */
    error?: string;
    /** What the last command did, shown for a moment, with Undo when the queue it took away can be brought back. */
    notice?: { text: string; undo: boolean };
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
        /** The position of the sound, sent every few seconds while playing. */
        playerPositionReceived: {
            reducer(sliceState, action: PayloadAction<{ positionSec: number; receivedAt: number }>) {
                if (sliceState.state) {
                    sliceState.state.positionSec = action.payload.positionSec;
                    sliceState.receivedAt = action.payload.receivedAt;
                }
            },
            prepare: (positionSec: number) => ({ payload: { positionSec, receivedAt: Date.now() } }),
        },
        playerCommandFailed(sliceState, action: PayloadAction<string>) {
            sliceState.error = action.payload;
        },
        playerErrorDismissed(sliceState) {
            sliceState.error = undefined;
        },
        playerNoticeShown(sliceState, action: PayloadAction<{ text: string; undo?: boolean }>) {
            sliceState.notice = { text: action.payload.text, undo: action.payload.undo ?? false };
        },
        playerNoticeDismissed(sliceState) {
            sliceState.notice = undefined;
        },
    },
});

export const {
    playerStateReceived,
    playerPositionReceived,
    playerCommandFailed,
    playerErrorDismissed,
    playerNoticeShown,
    playerNoticeDismissed,
} = playerSlice.actions;
export default playerSlice.reducer;
