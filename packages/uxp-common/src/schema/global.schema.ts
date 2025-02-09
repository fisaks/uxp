import { KeywordDefinition } from "ajv";
import { GlobalConfigPayload } from "../global/global.types";
import { SchemaValidate } from "./schemaValidate";

export const GlobalConfigSchema: SchemaValidate<GlobalConfigPayload> = {
    body: {
        type: "object",
        properties: {
            key: {
                type: "string",
                enum: [
                    "siteName",
                    // "features.darkMode",
                    //"features.multi_language",
                ],
            },
            value: {
                type: ["string", "boolean", "number"],
                minLength: 2, // Added minlength constraint for siteName
            },
            currentVersion: { type: "integer" },
        },
        required: ["key", "value", "currentVersion"],
        validateGlobalConfigValue: true,
    },
};
export const ValidateGlobalConfigValue: KeywordDefinition = {
    keyword: "validateGlobalConfigValue",
    type: "object",
    schema: false,
    modifying: false,
    async: false,
    errors: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validate: (_schema: any, data: { rootData: GlobalConfigPayload }) => {
        const { key, value } = data.rootData;
        console.log("data", data);
        switch (key) {
            case "siteName":
                if (typeof value !== "string") return false;
                break;
            /*  case "features.darkMode":
            case "features.multi_language":
                if (typeof value !== "boolean") return false;
                break;
                */
            default:
                return false; // Unknown key
        }

        return true;
    },
};
