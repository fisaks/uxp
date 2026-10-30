// JSON schemas that validate the payloads of the library WebSocket actions and the parameters of the cover route
import { SchemaValidate } from "@uxp/common";
import { CoverParams } from "../types/library.type";

const ID_PATTERN = "^[0-9a-f]{16}$";
const ID_SCHEMA = { type: "string", pattern: ID_PATTERN };

export const LibraryGetAlbumsSchema = {
    type: "object",
    properties: { artistId: ID_SCHEMA },
    required: ["artistId"],
    additionalProperties: false,
};

export const LibraryGetTracksSchema = {
    type: "object",
    properties: { albumId: ID_SCHEMA },
    required: ["albumId"],
    additionalProperties: false,
};

export const CoverSchema: SchemaValidate<undefined, undefined, CoverParams> = {
    params: {
        type: "object",
        properties: { collection: { type: "string", enum: ["music", "audiobooks"] }, albumId: { type: "string", pattern: ID_PATTERN } },
        required: ["collection", "albumId"],
        additionalProperties: false,
    },
};
