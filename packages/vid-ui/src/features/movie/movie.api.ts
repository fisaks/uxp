import { MovieCategory, MovieItem, MovieMatchCandidate } from "@vid/common";
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
        /** The TMDB entries for the words, for picking the right one for an item. */
        searchMovieMatches: builder.query<MovieMatchCandidate[], { id: string; q: string }>({
            query: ({ id, q }) => ({ url: apiUrl(`movies/items/${id}/tmdb-search`), params: { q } }),
        }),
        /** Sets the TMDB entry of an item, or none with null. With the entry it already has, it fetches the data and the poster again. */
        setMovieMatch: builder.mutation<MovieItem, { id: string; tmdbId: number | null }>({
            query: ({ id, tmdbId }) => ({ url: apiUrl(`movies/items/${id}/match`), method: "PUT", data: { tmdbId } }),
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
    }),
    overrideExisting: false,
});

export const { useGetMovieItemsQuery, useSearchMovieMatchesQuery, useSetMovieMatchMutation } = movieApi;
