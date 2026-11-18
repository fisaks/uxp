import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { UploadSession } from "@vid/common";

/**
 * `ready` is chosen but not started (its date can still be set), `queued` waits for its turn, `uploading` sends chunks,
 * `paused` stopped on a break or a busy server and can be resumed, `processing` is made ready by the server.
 */
export type UploadPhase = "ready" | "queued" | "uploading" | "paused" | "processing" | "done" | "failed";

export type UploadItem = {
    /** Names the item in the list and its file in the runner. */
    key: string;
    name: string;
    sizeBytes: number;
    /** The date of the clip (YYYY-MM-DD); null leaves it to the server, which reads it from the video. */
    date: string | null;
    phase: UploadPhase;
    /** How many bytes the server has. */
    sent: number;
    sessionId?: string;
    /** An `ErrorCodes` value that says why the phase is `paused` or `failed`. */
    errorCode?: string;
    clipId?: string;
};

type UploadState = { items: UploadItem[] };

const update = (slice: UploadState, key: string, change: Partial<UploadItem>) => {
    const item = slice.items.find((i) => i.key === key);
    if (item) Object.assign(item, change);
};

const uploadSlice = createSlice({
    name: "upload",
    initialState: { items: [] } as UploadState,
    reducers: {
        itemsAdded: (slice, action: PayloadAction<UploadItem[]>) => {
            slice.items.push(...action.payload);
        },
        itemRemoved: (slice, action: PayloadAction<string>) => {
            slice.items = slice.items.filter((i) => i.key !== action.payload);
        },
        finishedCleared: (slice) => {
            slice.items = slice.items.filter((i) => i.phase !== "done");
        },
        dateSet: (slice, action: PayloadAction<{ key: string; date: string | null }>) => {
            update(slice, action.payload.key, { date: action.payload.date });
        },
        phaseSet: (slice, action: PayloadAction<{ key: string; phase: UploadPhase; errorCode?: string }>) => {
            update(slice, action.payload.key, { phase: action.payload.phase, errorCode: action.payload.errorCode });
        },
        sessionCreated: (slice, action: PayloadAction<{ key: string; sessionId: string }>) => {
            update(slice, action.payload.key, { sessionId: action.payload.sessionId });
        },
        progressed: (slice, action: PayloadAction<{ key: string; sent: number }>) => {
            update(slice, action.payload.key, { sent: action.payload.sent });
        },
        /** What the BFF pushes when the file has been made ready, or could not be. */
        serverStateReceived: (slice, action: PayloadAction<UploadSession>) => {
            const { id, state, clipId, errorCode } = action.payload;
            const item = slice.items.find((i) => i.sessionId === id);
            if (!item) return;
            if (state === "done") Object.assign(item, { phase: "done", clipId, errorCode: undefined });
            if (state === "failed") Object.assign(item, { phase: "failed", errorCode });
        },
    },
});

export const { itemsAdded, itemRemoved, finishedCleared, dateSet, phaseSet, sessionCreated, progressed, serverStateReceived } =
    uploadSlice.actions;
export const uploadReducer = uploadSlice.reducer;
