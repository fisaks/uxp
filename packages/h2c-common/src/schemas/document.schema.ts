import { SchemaValidate } from "@uxp/common";

export const GetDocumentSchema: SchemaValidate<undefined, undefined, { documentId: string, version: number }> = {
    params: {
        type: "object",
        properties: {
            documentId: { type: "string", minLength: 21, maxLength: 21, pattern: "^[a-zA-Z0-9_-]+$" },
            version: { type: "number", minimum: 0 },
        },
        required: ["documentId", "version"],
        additionalProperties: false,
    },
};