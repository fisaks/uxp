import { SchemaValidate } from "@uxp/common";
import { UPLOAD_MAX_FILE_BYTES, UploadChunkQuery, UploadCreateRequest, UploadParams } from "../types/upload.type";

const ID_PATTERN = "^[0-9a-f]{16}$";

export const UploadParamsSchema: SchemaValidate<undefined, undefined, UploadParams> = {
    params: {
        type: "object",
        properties: { id: { type: "string", pattern: ID_PATTERN } },
        required: ["id"],
        additionalProperties: false,
    },
};

/** The size is checked against the limit by the service, so the client gets FILE_TOO_LARGE and not a validation error. */
export const UploadCreateSchema = {
    body: {
        type: "object",
        properties: {
            sizeBytes: { type: "integer", minimum: 1 },
            originalName: { type: "string", maxLength: 255 },
        },
        required: ["sizeBytes"],
        additionalProperties: false,
    },
} as unknown as SchemaValidate<UploadCreateRequest, undefined, undefined>;

export const UploadChunkSchema = {
    params: UploadParamsSchema.params,
    querystring: {
        type: "object",
        properties: { offset: { type: "integer", minimum: 0, maximum: UPLOAD_MAX_FILE_BYTES } },
        required: ["offset"],
        additionalProperties: false,
    },
} as unknown as SchemaValidate<undefined, UploadChunkQuery, UploadParams>;
