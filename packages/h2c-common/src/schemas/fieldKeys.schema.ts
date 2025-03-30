import { SchemaValidate } from "@uxp/common";
import { FieldKeyType, fieldKeyTypes, FieldKeyWithType, NewFieldKeyPayload } from "../types/field.key.types";

export const FieldKeyByTypeSchema: SchemaValidate<undefined, { types: FieldKeyType | FieldKeyType[] }> = {
    querystring: {
        type: "object",
        properties: {
            types: {
                oneOf: [
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
            "key": { type: "string", minLength: 1 , maxLength: 100 },

            "type": {
                type: "string",
                enum: fieldKeyTypes,
            },
        },
        required: ["key", "type"],
        additionalProperties: false,
    },
};