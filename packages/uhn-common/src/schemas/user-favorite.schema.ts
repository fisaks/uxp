import { SchemaValidate } from "@uxp/common";
import { AddFavoriteRequest, RemoveFavoriteParams, ReorderFavoritesRequest } from "../types/user-favorite.type";

export const AddFavoriteSchema: SchemaValidate<AddFavoriteRequest> = {
    body: {
        type: "object",
        properties: {
            itemKind: { type: "string", enum: ["resource", "view", "scene"] },
            itemRefId: { type: "string", minLength: 1, maxLength: 128 },
        },
        required: ["itemKind", "itemRefId"],
        additionalProperties: false,
    },
};

export const RemoveFavoriteSchema: SchemaValidate<undefined, undefined, RemoveFavoriteParams> = {
    params: {
        type: "object",
        properties: {
            id: { type: "number", minimum: 1 },
        },
        required: ["id"],
    },
};

export const ReorderFavoritesSchema: SchemaValidate<ReorderFavoritesRequest> = {
    body: {
        type: "object",
        properties: {
            orderedIds: {
                type: "array",
                items: { type: "number", minimum: 1 },
                minItems: 1,
            },
        },
        required: ["orderedIds"],
        additionalProperties: false,
    },
};
