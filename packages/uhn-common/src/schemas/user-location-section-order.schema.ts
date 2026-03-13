import { SchemaValidate } from "@uxp/common";
import { SaveLocationSectionOrderRequest } from "../types/user-location-section-order.type";

export const SaveLocationSectionOrderSchema: SchemaValidate<SaveLocationSectionOrderRequest> = {
    body: {
        type: "object",
        properties: {
            locationIds: {
                type: "array",
                items: { type: "string" as const, minLength: 1, maxLength: 128 },
                minItems: 1,
            },
        },
        required: ["locationIds"],
        additionalProperties: false,
    },
};
