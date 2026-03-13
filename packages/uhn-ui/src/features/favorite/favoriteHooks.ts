import { UserFavoriteItemKind } from "@uhn/common";
import { useCallback, useMemo } from "react";
import { useAddFavoriteMutation, useFetchFavoritesQuery, useRemoveFavoriteMutation } from "./favorite.api";

/** Returns a Set of "kind:refId" keys for O(1) favorite lookups. */
export function useFavoriteSet(): Set<string> {
    const { data: favorites } = useFetchFavoritesQuery();
    return useMemo(
        () => new Set(favorites?.map(f => `${f.itemKind}:${f.itemRefId}`) ?? []),
        [favorites],
    );
}

/** Returns a callback that toggles favorite status for a given item. */
export function useToggleFavorite() {
    const { data: favorites } = useFetchFavoritesQuery();
    const [addFavorite] = useAddFavoriteMutation();
    const [removeFavorite] = useRemoveFavoriteMutation();

    return useCallback((itemKind: UserFavoriteItemKind, itemRefId: string) => {
        const existing = favorites?.find(f => f.itemKind === itemKind && f.itemRefId === itemRefId);
        if (existing) {
            removeFavorite(existing.id);
        } else {
            addFavorite({ itemKind, itemRefId });
        }
    }, [favorites, addFavorite, removeFavorite]);
}
