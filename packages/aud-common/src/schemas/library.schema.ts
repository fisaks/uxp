// JSON schemas that validate the payloads of the library WebSocket actions

const ID_SCHEMA = { type: "string", pattern: "^[0-9a-f]{16}$" };

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
