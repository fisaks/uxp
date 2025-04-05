import { SchemaValidate } from "@uxp/common";
import { FieldKeyType, fieldKeyTypes, FieldKeyWithType, NewFieldKeyPayload, RemoveFieldKeyPayload } from "../types/field.key.types";

export const FieldKeyByTypeSchema: SchemaValidate<undefined, { types: FieldKeyType | FieldKeyType[] }> = {
    querystring: {
        type: "object",
        properties: {
            types: {
                anyOf: [
                    { type: "string", enum: fieldKeyTypes, },
                    {
                        type: "array",
                        items: { type: "string", enum: fieldKeyTypes },
                        minItems: 1,
                    },
                ]
            },
        },
        required: ["types"],
        additionalProperties: false,
    },
};


export const AddFieldKeySchema: SchemaValidate<NewFieldKeyPayload> = {
    body: {
        type: "object",
        properties: {
            "key": { type: "string", minLength: 1, maxLength: 100, pattern: "^\\s*\\S.*$" },

            "type": {
                type: "string",
                enum: fieldKeyTypes,
            },
        },
        required: ["key", "type"],
        additionalProperties: false,
    },
};

export const RemoveFieldKeySchema: SchemaValidate<undefined, RemoveFieldKeyPayload> = {
    querystring: {
        type: "object",
        properties: {
            "key": { type: "string", minLength: 1, maxLength: 100, pattern: "^\\s*\\S.*$" },

            "type": {
                type: "string",
                enum: fieldKeyTypes,
            },
        },
        required: ["key", "type"],
        additionalProperties: false,
    },
};