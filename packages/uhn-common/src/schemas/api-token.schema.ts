import { SchemaValidate } from "@uxp/common";

export const CreateApiTokenSchema: SchemaValidate<{ label: string; blueprintIdentifier: string }> = {
    body: {
        type: "object",
        properties: {
            label: { type: "string", minLength: 1, maxLength: 100 },
            blueprintIdentifier: { type: "string", minLength: 1, maxLength: 64, pattern: "^[a-z0-9-_]+$" },
        },
        required: ["label", "blueprintIdentifier"],
        additionalProperties: false,
    },
};

export const RevokeApiTokenSchema: SchemaValidate<undefined, undefined, { id: number }> = {
    params: {
        type: "object",
        properties: {
            id: { type: "number", minimum: 1 },
        },
        required: ["id"],
    },
};

export const CliUploadBlueprintSchema: SchemaValidate<undefined, { activate?: boolean }> = {
    querystring: {
        type: "object",
        properties: {
            activate: { type: "boolean", nullable: true },
        },
        required: [],
        additionalProperties: false,
    },
};
