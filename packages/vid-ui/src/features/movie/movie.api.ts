import {
    MovieAudioUpdate,
    MovieCategory,
    MovieItem,
    MovieMatchCandidate,
    MovieSearchResult,
    MovieSubtitleUpdate,
    MovieTmdbKind,
} from "@vid/common";
import { apiUrl } from "../../api/home-video-api";
import { vidApi } from "../../app/vidApi";
import { compareMovies } from "./movieFormat";
import { posterBumped } from "./movieUrls";

export const movieApi = vidApi.injectEndpoints({
    endpoints: (builder) => ({
        /** The items of a category, by title. Without a category, the items of all of them. */
        getMovieItems: builder.query<MovieItem[], MovieCategory | undefined>({
            query: (category) => ({ url: apiUrl("movies/items"), params: { category } }),
            transformResponse: (all: MovieItem[]) => [...all].sort(compareMovies),
            providesTags: ["Movies"],
        }),
        /** The ids of the items that match the words, best first. */
        searchMovies: builder.query<string[], string>({
            query: (q) => ({ url: apiUrl("movies/search"), params: { q } }),
            transformResponse: (result: MovieSearchResult) => result.ids,
        }),
        /** The TMDB entries for the words, for picking the right one for an item. */
        searchMovieMatches: builder.query<MovieMatchCandidate[], { id: string; q: string }>({
            query: ({ id, q }) => ({ url: apiUrl(`movies/items/${id}/tmdb-search`), params: { q } }),
        }),
        /** Sets the TMDB entry of an item, or none with null. With the entry it already has, it fetches the data and the poster again. */
        setMovieMatch: builder.mutation<MovieItem, { id: string; tmdbId: number | null; kind?: MovieTmdbKind }>({
            query: ({ id, tmdbId, kind }) => ({ url: apiUrl(`movies/items/${id}/match`), method: "PUT", data: { tmdbId, kind } }),
            invalidatesTags: ["Movies"],
            onQueryStarted: async ({ id }, { queryFulfilled }) => {
                try {
                    await queryFulfilled;
                    posterBumped(id);
                } catch {
                    // The page shows the error of the mutation.
                }
            },
        }),
        /** Sets the audio track of a film. The BFF has a Chromecast that plays the film load it again with the track. */
        setMovieAudio: builder.mutation<MovieItem, { id: string } & MovieAudioUpdate>({
            query: ({ id, audio }) => ({ url: apiUrl(`movies/items/${id}/audio`), method: "PUT", data: { audio } }),
            invalidatesTags: ["Movies"],
        }),
        /** Sets the subtitle that shows when the film is played, null for none. */
        setMovieSubtitle: builder.mutation<MovieItem, { id: string } & MovieSubtitleUpdate>({
            query: ({ id, subtitle }) => ({ url: apiUrl(`movies/items/${id}/subtitle`), method: "PUT", data: { subtitle } }),
            invalidatesTags: ["Movies"],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetMovieItemsQuery,
    useSearchMoviesQuery,
    useSearchMovieMatchesQuery,
    useSetMovieMatchMutation,
    useSetMovieAudioMutation,
    useSetMovieSubtitleMutation,
} = movieApi;
