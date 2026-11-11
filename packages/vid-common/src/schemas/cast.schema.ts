import { SchemaValidate } from "@uxp/common";
import { VIDEO_ID_PATTERN } from "../types/video-id";
import {
    CAST_PLAYBACK_RATES,
    CastDeviceParams,
    CastQueueRequest,
    CastRateRequest,
    CastSeekRequest,
    CastStartRequest,
    TvPairConfirmRequest,
    TvPowerRequest,
} from "../types/cast.type";

const ID_PATTERN = VIDEO_ID_PATTERN;
/** A Chromecast announces a UUID without dashes as its id. */
const DEVICE_ID_PATTERN = "^[0-9a-f]{32}$";

export const CastDeviceParamsSchema: SchemaValidate<undefined, undefined, CastDeviceParams> = {
    params: {
        type: "object",
        properties: { deviceId: { type: "string", pattern: DEVICE_ID_PATTERN } },
        required: ["deviceId"],
        additionalProperties: false,
    },
};

export const CastStartSchema = {
    body: {
        type: "object",
        properties: {
            clipId: { type: "string", pattern: ID_PATTERN },
            deviceIds: {
                type: "array",
                items: { type: "string", pattern: DEVICE_ID_PATTERN },
                minItems: 1,
                maxItems: 20,
                uniqueItems: true,
            },
            positionSec: { type: "number", minimum: 0 },
        },
        required: ["clipId", "deviceIds"],
        additionalProperties: false,
    },
} as unknown as SchemaValidate<CastStartRequest, undefined, undefined>;

export const CastSeekSchema = {
    params: CastDeviceParamsSchema.params,
    body: {
        type: "object",
        properties: { positionSec: { type: "number", minimum: 0 } },
        required: ["positionSec"],
        additionalProperties: false,
    },
} as unknown as SchemaValidate<CastSeekRequest, undefined, CastDeviceParams>;

export const CastRateSchema = {
    params: CastDeviceParamsSchema.params,
    body: {
        type: "object",
        properties: { rate: { type: "number", enum: CAST_PLAYBACK_RATES } },
        required: ["rate"],
        additionalProperties: false,
    },
} as unknown as SchemaValidate<CastRateRequest, undefined, CastDeviceParams>;

const clipIds = { type: "array", items: { type: "string", pattern: ID_PATTERN }, minItems: 1, maxItems: 500 };
const queueIndex = { type: "integer", minimum: 0 };

/** One schema for every action: which fields an action needs is checked where it is applied. */
export const CastQueueSchema = {
    params: CastDeviceParamsSchema.params,
    body: {
        type: "object",
        properties: {
            action: { type: "string", enum: ["replace", "next", "append", "remove", "move", "jump", "repeat"] },
            clipIds,
            index: queueIndex,
            from: queueIndex,
            to: queueIndex,
            repeat: { type: "boolean" },
        },
        required: ["action"],
        additionalProperties: false,
    },
} as unknown as SchemaValidate<CastQueueRequest, undefined, CastDeviceParams>;

export const TvPairConfirmSchema = {
    params: CastDeviceParamsSchema.params,
    body: {
        type: "object",
        properties: { pin: { type: "string", pattern: "^[0-9]{4,8}$" } },
        required: ["pin"],
        additionalProperties: false,
    },
} as unknown as SchemaValidate<TvPairConfirmRequest, undefined, CastDeviceParams>;

export const TvPowerSchema = {
    params: CastDeviceParamsSchema.params,
    body: {
        type: "object",
        properties: { state: { type: "string", enum: ["On", "Standby"] } },
        required: ["state"],
        additionalProperties: false,
    },
} as unknown as SchemaValidate<TvPowerRequest, undefined, CastDeviceParams>;
