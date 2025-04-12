import { SchemaValidate } from "@uxp/common";

export const GetDocumentSchema: SchemaValidate<undefined, undefined, { documentId: string, version: number | "snapshot" }> = {
    params: {
        type: "object",
        properties: {
            documentId: { type: "string", minLength: 21, maxLength: 21, pattern: "^[a-zA-Z0-9_-]+$" },
            version: { 
                anyOf: [
                    { type: "number", minimum: 0 },
                    { type: "string", enum: ["snapshot"] }
                ]
            },
        },
        required: ["documentId", "version"],
        additionalProperties: false,
    },
};

export const GetVersionsSchema: SchemaValidate<undefined, undefined, { documentId: string }> = {
    params: {
        type: "object",
        properties: {
            documentId: { type: "string", minLength: 21, maxLength: 21, pattern: "^[a-zA-Z0-9_-]+$" },
        },
        required: ["documentId"],
        additionalProperties: false,
    },
};