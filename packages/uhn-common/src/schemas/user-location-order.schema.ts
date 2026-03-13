import { SchemaValidate } from "@uxp/common";
import { LocationOrderParams, SaveLocationOrderRequest } from "../types/user-location-order.type";

export const SaveLocationOrderSchema: SchemaValidate<SaveLocationOrderRequest, undefined, LocationOrderParams> = {
    body: {
        type: "object",
        properties: {
            locationItems: {
                type: "array",
                items: {
                    type: "object" as const,
                    properties: {
                        kind: { type: "string" as const, enum: ["resource", "view", "scene"] as const },
                        refId: { type: "string" as const, minLength: 1, maxLength: 128 },
                    },
                    required: ["kind", "refId"] as const,
                    additionalProperties: false,
                },
                minItems: 1,
            },
        },
        required: ["locationItems"],
        additionalProperties: false,
    },
    params: {
        type: "object",
        properties: {
            locationId: { type: "string", minLength: 1, maxLength: 128 },
        },
        required: ["locationId"],
    },
};

export const DeleteLocationOrderSchema: SchemaValidate<undefined, undefined, LocationOrderParams> = {
    params: {
        type: "object",
        properties: {
            locationId: { type: "string", minLength: 1, maxLength: 128 },
        },
        required: ["locationId"],
    },
};
