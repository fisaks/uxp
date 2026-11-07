import { SchemaValidate } from "@uxp/common";
import { HomeVideoClipParams, HomeVideoClipUpdate } from "../types/home-video.type";

const ID_PATTERN = "^[0-9a-f]{16}$";
const LABELS_SCHEMA = { type: "array", items: { type: "string", minLength: 1, maxLength: 100 }, maxItems: 100 };

export const HomeVideoClipParamsSchema: SchemaValidate<undefined, undefined, HomeVideoClipParams> = {
    params: {
        type: "object",
        properties: { id: { type: "string", pattern: ID_PATTERN } },
        required: ["id"],
        additionalProperties: false,
    },
};

export const HomeVideoClipUpdateSchema = {
    params: HomeVideoClipParamsSchema.params,
    body: {
        type: "object",
        properties: {
            date: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$", nullable: true },
            title: { type: "string", maxLength: 200 },
            description: { type: "string", maxLength: 5000 },
            people: LABELS_SCHEMA,
            tags: LABELS_SCHEMA,
        },
        additionalProperties: false,
    },
} as unknown as SchemaValidate<HomeVideoClipUpdate, undefined, HomeVideoClipParams>;
