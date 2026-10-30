// JSON schemas that validate the payloads of the player WebSocket actions

import { REPEAT_MODES } from "../types/player.type";

const TRACK_ID_SCHEMA = { type: "string", pattern: "^[0-9a-f]{16}$" };
const MAX_TRACKS = 5000;

export const PlayerPlayTracksSchema = {
    type: "object",
    properties: {
        trackIds: { type: "array", items: TRACK_ID_SCHEMA, minItems: 1, maxItems: MAX_TRACKS },
        /** The track of `trackIds` to start with. */
        startIndex: { type: "integer", minimum: 0 },
    },
    required: ["trackIds"],
    additionalProperties: false,
};

export const PlayerEnqueueSchema = {
    type: "object",
    properties: { trackIds: { type: "array", items: TRACK_ID_SCHEMA, minItems: 1, maxItems: MAX_TRACKS } },
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
