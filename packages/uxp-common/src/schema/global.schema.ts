import { KeywordDefinition } from "ajv";
import { GlobalConfigKey, GlobalConfigPayload } from "../global/global.types";
import { SchemaValidate } from "./schemaValidate";

const VALID_KEYS = [
    "siteName",
    "notification",
    "notification.email",
    "notification.email.enabled",
    "notification.email.smtp",
    "notification.email.smtp.host",
    "notification.email.smtp.port",
    "notification.email.smtp.secure",
    "notification.email.smtp.user",
    "notification.email.smtp.password",
    "notification.email.smtp.from",
    "notification.email.recipients",
    "healthChecks",
    "healthChecks.tlsCert",
    "healthChecks.tlsCert.enabled",
    "healthChecks.tlsCert.domain",
    "healthChecks.tlsCert.warnDays",
    "healthChecks.tlsCert.errorDays",
    "healthChecks.tlsCert.intervalHours",
] as const satisfies GlobalConfigKey[];

/** Runtime shape for AJV schema validation (the DotPath union is compile-time only) */

export const PatchGlobalConfigSchema: SchemaValidate<{
    key: GlobalConfigKey;
    value: GlobalConfigPayload["value"];
}> = {
    body: {
        type: "object",
        properties: {
            key: {
                type: "string",
                enum: [...VALID_KEYS],
            },
            value: { type: ["boolean", "number", "object", "array", "string"] } as never,
        },
        required: ["key", "value"],
        additionalProperties: false,
        validateGlobalConfigValue: true,
    },
};

function isString(value: unknown, minLength: number, maxLength: number): boolean {
    return typeof value === "string" && value.length >= minLength && value.length <= maxLength;
}

// Simple email check — not RFC 5322 complete, but catches obvious mistakes
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates a plain email or "Display Name <email>" format */
function isEmail(value: string): boolean {
    const match = value.match(/<([^>]+)>/);
    const addr = match ? match[1] : value;
    return EMAIL_RE.test(addr.trim());
}

export const ValidateGlobalConfigValue: KeywordDefinition = {
    keyword: "validateGlobalConfigValue",
    type: "object",
    schema: false,
    modifying: false,
    async: false,
    errors: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validate: (_schema: any, data: { rootData: { key: string; value: unknown } }) => {
        const { key, value } = data.rootData;

        switch (key) {
            case "siteName":
                return isString(value, 2, 100);

            case "notification.email.enabled":
                return typeof value === "boolean";

            case "notification.email.smtp.host":
            case "notification.email.smtp.user":
            case "notification.email.smtp.password":
                return isString(value, 0, 255);
            case "notification.email.smtp.from":
                return isString(value, 0, 255) && (value === "" || isEmail(value as string));
            case "notification.email.smtp.port":
                return typeof value === "number" && value > 0 && value <= 65535;
            case "notification.email.smtp.secure":
                return typeof value === "boolean";
            case "notification.email.smtp":
                return typeof value === "object" && value !== null;

            case "notification.email.recipients":
                return Array.isArray(value)
                    && value.length <= 50
                    && value.every((e: unknown) => isString(e, 1, 255) && isEmail(e as string));

            case "notification.email":
            case "notification":
                return typeof value === "object" && value !== null;

            case "healthChecks.tlsCert.enabled":
                return typeof value === "boolean";
            case "healthChecks.tlsCert.domain":
                return isString(value, 0, 255);
            case "healthChecks.tlsCert.warnDays":
            case "healthChecks.tlsCert.errorDays":
                return typeof value === "number" && value > 0 && value <= 365;
            case "healthChecks.tlsCert.intervalHours":
                return typeof value === "number" && value >= 1 && value <= 168;

            case "healthChecks.tlsCert":
            case "healthChecks":
                return typeof value === "object" && value !== null;

            default:
                return false;
        }
    },
};
