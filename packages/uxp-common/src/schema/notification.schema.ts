import { SendEmailBody } from "../notification/notification.types";
import { SchemaValidate } from "./schemaValidate";

export const SendEmailSchema: SchemaValidate<SendEmailBody> = {
    body: {
        type: "object",
        properties: {
            subject: { type: "string", minLength: 1, maxLength: 500 },
            text: { type: "string", minLength: 1, maxLength: 10000 },
            to: {
                type: "array",
                items: { type: "string", format: "email" },
                maxItems: 50,
                nullable: true,
            },
            html: { type: "string", maxLength: 50000, nullable: true },
        },
        required: ["subject", "text"],
        additionalProperties: false,
    },
};
