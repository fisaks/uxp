import { SchemaValidate } from "@uxp/common";
import { CastGroupParams, CastGroupRequest, CastGroupStartRequest } from "../types/cast-group.type";

/** The same pattern as a device id: a group is played with the routes of a device. */
const GROUP_ID_PATTERN = "^[0-9a-f]{32}$";
const DEVICE_ID_PATTERN = "^[0-9a-f]{32}$";
export const CAST_GROUP_NAME_MAX_LENGTH = 100;
/** Members of a group, counting the player tab when it joins. */
export const CAST_GROUP_MIN_MEMBERS = 2;

export const CastGroupParamsSchema: SchemaValidate<undefined, undefined, CastGroupParams> = {
    params: {
        type: "object",
        properties: { id: { type: "string", pattern: GROUP_ID_PATTERN } },
        required: ["id"],
        additionalProperties: false,
    },
};

export const CastGroupSaveSchema = {
    body: {
        type: "object",
        properties: {
            name: { type: "string", minLength: 1, maxLength: CAST_GROUP_NAME_MAX_LENGTH },
            deviceIds: {
                type: "array",
                items: { type: "string", pattern: DEVICE_ID_PATTERN },
                minItems: 1,
                maxItems: 20,
                uniqueItems: true,
            },
            browser: { type: "boolean" },
        },
        required: ["name", "deviceIds"],
        additionalProperties: false,
    },
} as unknown as SchemaValidate<CastGroupRequest, undefined, undefined>;

export const CastGroupUpdateSchema = {
    params: CastGroupParamsSchema.params,
    body: CastGroupSaveSchema.body,
} as unknown as SchemaValidate<CastGroupRequest, undefined, CastGroupParams>;

export const CastGroupStartSchema = {
    params: CastGroupParamsSchema.params,
    body: {
        type: "object",
        properties: {
            clipId: { type: "string", pattern: "^[0-9a-f]{16}$" },
            positionSec: { type: "number", minimum: 0 },
        },
        required: ["clipId"],
        additionalProperties: false,
    },
} as unknown as SchemaValidate<CastGroupStartRequest, undefined, CastGroupParams>;
