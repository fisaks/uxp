import { SchemaValidate } from "@uxp/common";
import { PlaylistParams, PlaylistRenameRequest, PlaylistSaveRequest } from "../types/playlist.type";

const DEVICE_ID_PATTERN = "^[0-9a-f]{32}$";
const CLIP_ID_PATTERN = "^[0-9a-f]{16}$";
const PLAYLIST_ID_PATTERN = "^[0-9a-f]{16}$";
export const PLAYLIST_NAME_MAX_LENGTH = 100;

const name = { type: "string", minLength: 1, maxLength: PLAYLIST_NAME_MAX_LENGTH };

export const PlaylistParamsSchema: SchemaValidate<undefined, undefined, PlaylistParams> = {
    params: {
        type: "object",
        properties: { id: { type: "string", pattern: PLAYLIST_ID_PATTERN } },
        required: ["id"],
        additionalProperties: false,
    },
};

export const PlaylistSaveSchema = {
    body: {
        type: "object",
        properties: {
            deviceId: { type: "string", pattern: DEVICE_ID_PATTERN },
            clipIds: { type: "array", items: { type: "string", pattern: CLIP_ID_PATTERN }, minItems: 1, maxItems: 500 },
            name,
            replace: { type: "boolean" },
        },
        required: ["name"],
        oneOf: [{ required: ["deviceId"] }, { required: ["clipIds"] }],
        additionalProperties: false,
    },
} as unknown as SchemaValidate<PlaylistSaveRequest, undefined, undefined>;

export const PlaylistRenameSchema = {
    params: PlaylistParamsSchema.params,
    body: { type: "object", properties: { name }, required: ["name"], additionalProperties: false },
} as unknown as SchemaValidate<PlaylistRenameRequest, undefined, PlaylistParams>;
