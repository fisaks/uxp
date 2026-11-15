import { SchemaValidate } from "@uxp/common";
import { HomeVideoStreamQuery } from "../types/home-video.type";
import { MovieItemParams, MovieItemsQuery, MovieItemUpdate, MovieMatchQuery, MovieMatchUpdate, MovieSearchQuery, MovieSubtitleParams } from "../types/movie.type";
import { MOVIE_ID_PATTERN } from "../types/video-id";

export const MovieItemParamsSchema: SchemaValidate<undefined, undefined, MovieItemParams> = {
    params: {
        type: "object",
        properties: { id: { type: "string", pattern: MOVIE_ID_PATTERN } },
        required: ["id"],
        additionalProperties: false,
    },
};

export const MovieItemsSchema = {
    querystring: {
        type: "object",
        properties: { category: { type: "string", enum: ["movies", "kids", "tv"] } },
        additionalProperties: false,
    },
} as unknown as SchemaValidate<undefined, MovieItemsQuery>;

export const MovieItemUpdateSchema = {
    params: MovieItemParamsSchema.params,
    body: {
        type: "object",
        properties: {
            title: { type: "string", minLength: 1, maxLength: 200 },
            year: { type: ["integer", "null"], minimum: 1888, maximum: 2100, nullable: true },
        },
        additionalProperties: false,
    },
} as unknown as SchemaValidate<MovieItemUpdate, undefined, MovieItemParams>;

export const MovieSubtitleSchema = {
    params: {
        type: "object",
        properties: { id: { type: "string", pattern: MOVIE_ID_PATTERN }, index: { type: "integer", minimum: 0, maximum: 99 } },
        required: ["id", "index"],
        additionalProperties: false,
    },
} as unknown as SchemaValidate<undefined, undefined, MovieSubtitleParams>;

export const MovieStreamSchema = {
    params: MovieItemParamsSchema.params,
    querystring: {
        type: "object",
        properties: { exp: { type: "integer" }, sig: { type: "string", pattern: "^[0-9a-f]{64}$" } },
        required: ["exp", "sig"],
        additionalProperties: false,
    },
} as unknown as SchemaValidate<undefined, HomeVideoStreamQuery, MovieItemParams>;

export const MovieMatchSearchSchema = {
    params: MovieItemParamsSchema.params,
    querystring: {
        type: "object",
        properties: { q: { type: "string", minLength: 1, maxLength: 200 } },
        required: ["q"],
        additionalProperties: false,
    },
} as unknown as SchemaValidate<undefined, MovieMatchQuery, MovieItemParams>;

export const MovieMatchUpdateSchema = {
    params: MovieItemParamsSchema.params,
    body: {
        type: "object",
        properties: {
            tmdbId: { type: ["integer", "null"], minimum: 1, nullable: true },
            kind: { type: "string", enum: ["movie", "tv"] },
        },
        required: ["tmdbId"],
        additionalProperties: false,
    },
} as unknown as SchemaValidate<MovieMatchUpdate, undefined, MovieItemParams>;

export const MovieSearchSchema: SchemaValidate<undefined, MovieSearchQuery> = {
    querystring: {
        type: "object",
        properties: { q: { type: "string", minLength: 1, maxLength: 200 } },
        required: ["q"],
        additionalProperties: false,
    },
};
