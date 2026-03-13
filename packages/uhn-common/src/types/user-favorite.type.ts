export type UserFavoriteItemKind = "resource" | "view" | "scene";

export type UserFavorite = {
    id: number;
    itemKind: UserFavoriteItemKind;
    itemRefId: string;
    sortOrder: number;
};

export type AddFavoriteRequest = {
    itemKind: UserFavoriteItemKind;
    itemRefId: string;
};

export type RemoveFavoriteParams = {
    id: number;
};

export type ReorderFavoritesRequest = {
    orderedIds: number[];
};
