import { HomeVideoClip, HomeVideoClipUpdate, HomeVideoLabels, HomeVideoSearchResult } from "@vid/common";
import { apiUrl } from "../../api/home-video-api";
import { vidApi } from "../../app/vidApi";
import { compareClips } from "./clipFormat";
import { saveFailed } from "./saveErrorSlice";

export const homeVideoApi = vidApi.injectEndpoints({
    endpoints: (builder) => ({
        /** The clips in the order of the timeline. */
        getClips: builder.query<HomeVideoClip[], void>({
            query: () => ({ url: apiUrl("home-videos/clips") }),
            transformResponse: (all: HomeVideoClip[]) => [...all].sort(compareClips),
        }),
        getLabels: builder.query<HomeVideoLabels, void>({
            query: () => ({ url: apiUrl("home-videos/labels") }),
            providesTags: ["Labels"],
        }),
        /** The ids of the clips that match the words, best match first. */
        searchClips: builder.query<string[], string>({
            query: (q) => ({ url: apiUrl("home-videos/search"), params: { q } }),
            transformResponse: (result: HomeVideoSearchResult) => result.ids,
        }),
        /** Shows the change at once and saves it; the clip goes back to what it was if saving fails. */
        updateClip: builder.mutation<HomeVideoClip, { id: string; update: HomeVideoClipUpdate }>({
            query: ({ id, update }) => ({ url: apiUrl(`home-videos/clips/${id}`), method: "PATCH", data: update }),
            invalidatesTags: ["Labels"],
            onQueryStarted: async ({ id, update }, { dispatch, queryFulfilled }) => {
                const replace = (clip: HomeVideoClip | HomeVideoClipUpdate) =>
                    dispatch(
                        homeVideoApi.util.updateQueryData("getClips", undefined, (clips) => {
                            const index = clips.findIndex((c) => c.id === id);
                            if (index >= 0) clips[index] = { ...clips[index], ...clip } as HomeVideoClip;
                        })
                    );
                const optimistic = replace(update);
                try {
                    replace((await queryFulfilled).data);
                } catch {
                    optimistic.undo();
                    dispatch(saveFailed("The change could not be saved."));
                }
            },
        }),
    }),
    overrideExisting: false,
});

export const { useGetClipsQuery, useGetLabelsQuery, useSearchClipsQuery, useUpdateClipMutation } = homeVideoApi;
