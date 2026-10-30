import { AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap } from "@aud/common";
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";
import { requestKey, RequestAction } from "./requestKey";
import { ContentTopic } from "./requestCacheSlice";

const selectRequestCacheState = (state: RootState) => state.requestCache;

/**
 * The latest answer to a question, typed as the answer of its action. The cache keeps every answer under the key of its
 * question (see `requestKey`), so this is the one place that says what is under a key.
 */
export const selectCachedAnswer = <A extends RequestAction>(action: A, payload: AudioAppActionPayloadRequestMap[A]) => {
    const key = requestKey(action, payload);
    return createSelector([selectRequestCacheState], (cache) => cache.answers[key] as AudioAppActionPayloadResponseMap[A] | undefined);
};

/** Goes up each time the server says that the topic has changed. */
export const selectContentVersion: Record<ContentTopic, (state: RootState) => number> = {
    library: createSelector([selectRequestCacheState], (cache): number => cache.versions.library),
    playlists: createSelector([selectRequestCacheState], (cache): number => cache.versions.playlists),
};
