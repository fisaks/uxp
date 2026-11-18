import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { UploadSession } from "@vid/common";

/**
 * `ready` is chosen but not started (its date can still be set), `queued` waits for its turn, `uploading` sends chunks,
 * `paused` stopped on a break or a busy server and can be resumed, `processing` is made ready by the server, `stopped` is
 * an upload the server has that this page has no file for (after a reload): pick the same file to go on, or remove it.
 */
export type UploadPhase = "ready" | "queued" | "uploading" | "paused" | "processing" | "stopped" | "done" | "failed";

export type UploadItem = {
    /** Names the item in the list and its file in the runner. */
    key: string;
    /** The username of the uploader. Only the rows of the signed-in user can be acted on, an admin can also remove a stopped one. */
    owner: string;
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
    /** While `processing`: 1 is the next in the queue of the server, absent once it is being converted. */
    queuePosition?: number;
    /** While `processing`: how far the conversion is, 0 to 100. */
    percent?: number;
    clipId?: string;
    /** While `stopped`: someone sends it right now (another device or tab), so it cannot be taken over. */
    active?: boolean;
};

type UploadState = { items: UploadItem[] };

const update = (slice: UploadState, key: string, change: Partial<UploadItem>) => {
    const item = slice.items.find((i) => i.key === key);
    if (item) Object.assign(item, change);
};

/** Starts the key of an item the page has no file for. */
const SERVER_KEY = "server-";

/** An item for an upload the server has and this page has no file for. */
const itemOfSession = (session: UploadSession): UploadItem => {
    const { id, owner, name, sizeBytes, offset, state, queuePosition, percent, errorCode, active } = session;
    const phase: UploadPhase = state === "uploading" ? "stopped" : state === "failed" ? "failed" : "processing";
    return { key: `${SERVER_KEY}${id}`, owner, name: name ?? id, sizeBytes, date: null, phase, sent: offset, sessionId: id, errorCode, queuePosition, percent, active };
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
        sessionCreated: (slice, action: PayloadAction<{ key: string; sessionId: string; sent: number }>) => {
            const { key, sessionId, sent } = action.payload;
            // The file was picked again and the server went on with the stopped upload: that one is not stopped any more.
            slice.items = slice.items.filter((i) => !(i.phase === "stopped" && i.sessionId === sessionId));
            update(slice, key, { sessionId, sent });
        },
        /**
         * The uploads the server has for the user, taken in when the page opens and on refresh. Stopped and processing items follow
         * the server, and a row for an upload the server no longer has is dropped. Items this page is sending itself are left as they are.
         */
        serverUploadsLoaded: (slice, action: PayloadAction<UploadSession[]>) => {
            const sessions = action.payload;
            slice.items = slice.items.filter((i) => !i.key.startsWith(SERVER_KEY) || sessions.some((s) => s.id === i.sessionId));
            for (const session of sessions) {
                const item = slice.items.find((i) => i.sessionId === session.id);
                if (!item) slice.items.push(itemOfSession(session));
                else if (item.phase === "stopped" || item.phase === "processing") Object.assign(item, itemOfSession(session), { key: item.key });
            }
        },
        progressed: (slice, action: PayloadAction<{ key: string; sent: number }>) => {
            update(slice, action.payload.key, { sent: action.payload.sent });
        },
        /** What the BFF pushes when the file has been made ready, or could not be. */
        serverStateReceived: (slice, action: PayloadAction<UploadSession>) => {
            const { id, state, clipId, errorCode, queuePosition, percent } = action.payload;
            const item = slice.items.find((i) => i.sessionId === id);
            if (state === "removed") {
                // Only a row for an upload this page has no file for goes (stopped, or one that failed): a file this page sends itself is removed by the page.
                slice.items = slice.items.filter((i) => !(i.key.startsWith(SERVER_KEY) && i.sessionId === id));
                return;
            }
            // An upload of this user from another device or tab is shown too, and follows what the server says.
            if (!item) {
                if (state !== "done") slice.items.push(itemOfSession(action.payload));
                return;
            }
            if (item.phase === "stopped") {
                if (state === "done") slice.items = slice.items.filter((i) => i !== item);
                else Object.assign(item, itemOfSession(action.payload), { key: item.key });
                return;
            }
            // A push that comes late must not take a finished item back.
            if (item.phase === "done" || item.phase === "failed") return;
            if (state === "queued" || state === "processing") Object.assign(item, { phase: "processing", queuePosition, percent });
            if (state === "done") Object.assign(item, { phase: "done", clipId, errorCode: undefined });
            if (state === "failed") Object.assign(item, { phase: "failed", errorCode });
        },
    },
});

export const { itemsAdded, itemRemoved, finishedCleared, dateSet, phaseSet, sessionCreated, serverUploadsLoaded, progressed, serverStateReceived } =
    uploadSlice.actions;
export const uploadReducer = uploadSlice.reducer;
