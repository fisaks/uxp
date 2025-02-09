import { SchemaValidate } from "@uxp/common";

export const FileGetSchema: SchemaValidate<undefined, undefined, { publicId: string }> = {
    params: {
        type: "object",
        properties: {
            publicId: { type: "string", minLength: 21, maxLength: 21, pattern: "^[a-zA-Z0-9_-]+$" },
        },
        required: ["publicId"],
    },
};