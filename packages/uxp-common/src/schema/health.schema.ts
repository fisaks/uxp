import { HealthKeyParams, UpsertHealthBody, UXP_HEALTH_IDS } from "../uxp/health.types";
import { SchemaValidate } from "./schemaValidate";

export const UpsertHealthSchema: SchemaValidate<UpsertHealthBody> = {
    body: {
        type: "object",
        properties: {
            key: { type: "string", enum: [...UXP_HEALTH_IDS] },
            severity: { type: "string", enum: ["ok", "warn", "error"] },
            message: { type: "string", minLength: 1, maxLength: 500 },
            details: { type: "object", nullable: true },
            source: { type: "string", maxLength: 100, nullable: true },
        },
        required: ["key", "severity", "message"],
        additionalProperties: false,
    },
};

export const HealthKeyParamsSchema: SchemaValidate<undefined, undefined, HealthKeyParams> = {
    params: {
        type: "object",
        properties: {
            key: { type: "string", enum: [...UXP_HEALTH_IDS] },
        },
        required: ["key"],
        additionalProperties: false,
    },
};
