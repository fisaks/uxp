import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/** What the server says has changed: the lists of the library, or the playlists. */
export type ContentTopic = "library" | "playlists" | "history";

type RequestCacheState = {
    /** The latest answer of every question that has been asked, by the question: "library_get_albums:{...}". */
    answers: Record<string, unknown>;
    /** Goes up when the server says that a topic has changed, which makes the views that show it ask again. */
    versions: Record<ContentTopic, number>;
};

const requestCacheSlice = createSlice({
    name: "requestCache",
    initialState: { answers: {}, versions: { library: 0, playlists: 0, history: 0 } } as RequestCacheState,
    reducers: {
        requestAnswered(sliceState, action: PayloadAction<{ key: string; data: unknown }>) {
            sliceState.answers[action.payload.key] = action.payload.data;
        },
        contentChanged(sliceState, action: PayloadAction<ContentTopic>) {
            sliceState.versions[action.payload]++;
        },
    },
});

export const { requestAnswered, contentChanged } = requestCacheSlice.actions;
export default requestCacheSlice.reducer;
