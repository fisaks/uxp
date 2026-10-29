// JSON schemas that validate the payloads of the playlist WebSocket actions

import { MAX_PLAYLIST_NAME_LENGTH } from "../types/playlist.type";

const PLAYLIST_ID_SCHEMA = { type: "string", pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" };
const TRACK_ID_SCHEMA = { type: "string", pattern: "^[0-9a-f]{16}$" };
const NAME_SCHEMA = { type: "string", minLength: 1, maxLength: MAX_PLAYLIST_NAME_LENGTH };
const TRACK_IDS_SCHEMA = { type: "array", items: TRACK_ID_SCHEMA, maxItems: 5000 };
const INDEX_SCHEMA = { type: "integer", minimum: 0 };

export const PlaylistIdSchema = {
    type: "object",
    properties: { id: PLAYLIST_ID_SCHEMA },
    required: ["id"],
    additionalProperties: false,
};

export const PlaylistCreateSchema = {
    type: "object",
    properties: { name: NAME_SCHEMA, trackIds: TRACK_IDS_SCHEMA },
    required: ["name", "trackIds"],
    additionalProperties: false,
};

export const PlaylistRenameSchema = {
    type: "object",
    properties: { id: PLAYLIST_ID_SCHEMA, name: NAME_SCHEMA },
    required: ["id", "name"],
    additionalProperties: false,
};

export const PlaylistAddTracksSchema = {
    type: "object",
    properties: { id: PLAYLIST_ID_SCHEMA, trackIds: { ...TRACK_IDS_SCHEMA, minItems: 1 } },
    required: ["id", "trackIds"],
    additionalProperties: false,
};

export const PlaylistRemoveTrackSchema = {
    type: "object",
    properties: { id: PLAYLIST_ID_SCHEMA, index: INDEX_SCHEMA },
    required: ["id", "index"],
    additionalProperties: false,
};

export const PlaylistMoveTrackSchema = {
    type: "object",
    properties: { id: PLAYLIST_ID_SCHEMA, from: INDEX_SCHEMA, to: INDEX_SCHEMA },
    required: ["id", "from", "to"],
    additionalProperties: false,
};
