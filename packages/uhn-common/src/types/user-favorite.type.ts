export type UserLocationItemKind = "resource" | "view" | "scene";

export type UserFavorite = {
    id: number;
    itemKind: UserLocationItemKind;
    itemRefId: string;
    sortOrder: number;
};

export type AddFavoriteRequest = {
    itemKind: UserLocationItemKind;
    itemRefId: string;
};

export type RemoveFavoriteParams = {
    id: number;
};

export type ReorderFavoritesRequest = {
    orderedIds: number[];
};
