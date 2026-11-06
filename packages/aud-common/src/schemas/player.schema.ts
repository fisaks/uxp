// JSON schemas that validate the payloads of the player WebSocket actions

import { GAIN_STEP_DB, MAX_GAIN_DB, MAX_SPEED, MIN_SPEED, REPEAT_MODES } from "../types/player.type";

const TRACK_ID_SCHEMA = { type: "string", pattern: "^[0-9a-f]{16}$" };
const MAX_TRACKS = 5000;
// What a queue is made of: a track of the library, or of Spotify.
const TRACK_REF_SCHEMA = { type: "string", pattern: "^([0-9a-f]{16}|spotify:track:[A-Za-z0-9]+)$" };

export const PlayerPlayTracksSchema = {
    type: "object",
    properties: {
        trackIds: { type: "array", items: TRACK_REF_SCHEMA, minItems: 1, maxItems: MAX_TRACKS },
        /** The track of `trackIds` to start with. */
        startIndex: { type: "integer", minimum: 0 },
        /** Turns shuffle on or off for the new queue, which keeps the setting of before when it is missing. */
        shuffle: { type: "boolean" },
        /** The playlist the tracks come from, so that it is remembered as played. */
        playlistId: { type: "string", minLength: 1 },
    },
    required: ["trackIds"],
    additionalProperties: false,
};

export const PlayerPlayBookSchema = {
    type: "object",
    properties: {
        albumId: TRACK_ID_SCHEMA,
        partId: TRACK_ID_SCHEMA,
    },
    required: ["albumId"],
    additionalProperties: false,
};

export const PlayerEnqueueSchema = {
    type: "object",
    properties: { trackIds: { type: "array", items: TRACK_REF_SCHEMA, minItems: 1, maxItems: MAX_TRACKS } },
    required: ["trackIds"],
    additionalProperties: false,
};

export const PlayerIndexSchema = {
    type: "object",
    properties: { index: { type: "integer", minimum: 0 } },
    required: ["index"],
    additionalProperties: false,
};

export const PlayerSeekSchema = {
    type: "object",
    properties: { positionSec: { type: "number", minimum: 0 } },
    required: ["positionSec"],
    additionalProperties: false,
};

export const PlayerSetShuffleSchema = {
    type: "object",
    properties: { on: { type: "boolean" } },
    required: ["on"],
    additionalProperties: false,
};

export const PlayerSetRepeatSchema = {
    type: "object",
    properties: { mode: { type: "string", enum: REPEAT_MODES } },
    required: ["mode"],
    additionalProperties: false,
};

export const PlayerMoveSchema = {
    type: "object",
    properties: { from: { type: "integer", minimum: 0 }, to: { type: "integer", minimum: 0 } },
    required: ["from", "to"],
    additionalProperties: false,
};

export const PlayerPlayNextSchema = PlayerEnqueueSchema;

export const PlayerPlayNowSchema = {
    type: "object",
    properties: { trackId: TRACK_REF_SCHEMA },
    required: ["trackId"],
    additionalProperties: false,
};

export const PlayerSetSpeedSchema = {
    type: "object",
    properties: { rate: { type: "number", minimum: MIN_SPEED, maximum: MAX_SPEED } },
    required: ["rate"],
    additionalProperties: false,
};

export const PlayerSetGainSchema = {
    type: "object",
    properties: { gainDb: { type: "number", minimum: 0, maximum: MAX_GAIN_DB, multipleOf: GAIN_STEP_DB } },
    required: ["gainDb"],
    additionalProperties: false,
};

export const PlayerSetTracksGainSchema = {
    type: "object",
    properties: {
        trackIds: { type: "array", items: TRACK_ID_SCHEMA, minItems: 1, maxItems: MAX_TRACKS },
        gainDb: PlayerSetGainSchema.properties.gainDb,
    },
    required: ["trackIds", "gainDb"],
    additionalProperties: false,
};

export const PlayerEnqueueSpotifySchema = {
    type: "object",
    properties: {
        uris: { type: "array", items: { type: "string", pattern: "^spotify:track:[A-Za-z0-9]+$" }, minItems: 1, maxItems: 50 },
        next: { type: "boolean" },
    },
    required: ["uris"],
    additionalProperties: false,
};
