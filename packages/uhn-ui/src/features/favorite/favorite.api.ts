import { UserFavorite, UserFavoriteItemKind } from "@uhn/common";
import { uhnApi } from "../../app/uhnApi";
import { getBaseUrl } from "../../config";

export const favoriteApi = uhnApi.injectEndpoints({
    endpoints: (builder) => ({
        fetchFavorites: builder.query<UserFavorite[], void>({
            query: () => ({ url: `${getBaseUrl()}/api/user/favorites` }),
            providesTags: ["Favorites"],
        }),

        addFavorite: builder.mutation<UserFavorite, { itemKind: UserFavoriteItemKind; itemRefId: string }>({
            query: ({ itemKind, itemRefId }) => ({
                url: `${getBaseUrl()}/api/user/favorites`,
                method: "POST",
                data: { itemKind, itemRefId },
            }),
            invalidatesTags: ["Favorites"],
        }),

        removeFavorite: builder.mutation<{ id: number }, number>({
            query: (id) => ({
                url: `${getBaseUrl()}/api/user/favorites/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Favorites"],
        }),

        reorderFavorites: builder.mutation<UserFavorite[], number[]>({
            query: (orderedIds) => ({
                url: `${getBaseUrl()}/api/user/favorites/reorder`,
                method: "PUT",
                data: { orderedIds },
            }),
            async onQueryStarted(orderedIds, { dispatch, queryFulfilled }) {
                // Optimistic update — reorder cache immediately so DnD feels instant
                const patchResult = dispatch(
                    favoriteApi.util.updateQueryData("fetchFavorites", undefined, (favorites) => {
                        const byId = new Map(favorites.map(f => [f.id, f]));
                        const reordered: UserFavorite[] = [];
                        orderedIds.forEach((id, index) => {
                            const fav = byId.get(id);
                            if (fav) reordered.push({ ...fav, sortOrder: index });
                        });
                        favorites.splice(0, favorites.length, ...reordered);
                    })
                );
                try {
                    // Replace optimistic data with actual server response
                    const { data } = await queryFulfilled;
                    dispatch(
                        favoriteApi.util.updateQueryData("fetchFavorites", undefined, (favorites) => {
                            favorites.splice(0, favorites.length, ...data);
                        })
                    );
                } catch {
                    patchResult.undo();
                }
            },
        }),
    }),
    overrideExisting: false,
});

export const {
    useFetchFavoritesQuery,
    useAddFavoriteMutation,
    useRemoveFavoriteMutation,
    useReorderFavoritesMutation,
} = favoriteApi;
