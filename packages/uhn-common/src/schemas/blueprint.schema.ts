import { SchemaValidate } from "@uxp/common";
import { JSONSchemaType } from "ajv";
import { BlueprintMetadata } from "../types/blueprint.type";

export const BlueprintMetadataSchema: JSONSchemaType<BlueprintMetadata> = {
    type: "object",
    properties: {
        identifier: { type: "string", maxLength: 64, pattern: "^[a-z0-9-_]+$" },
        name: { type: "string", maxLength: 255 },
        description: { type: "string", nullable: true, maxLength: 1024 },
        schemaVersion: { type: "number", minimum: 1, maximum: 1 },
    },
    required: ["identifier", "name", "schemaVersion"],
    additionalProperties: false,
}

export const BlueprintVersionUrlParamsSchema: SchemaValidate<undefined, undefined, { identifier: string, version: number }> = {
    params: {
        type: "object",
        properties: {
            identifier: { type: "string", maxLength: 64, pattern: "^[a-z0-9-_]+$" },
            version: { type: "number", minimum: 1 },
        },
        required: ["identifier", "version"],
    },
};

export const ActivateBlueprintSchema = BlueprintVersionUrlParamsSchema;
export const DeleteBlueprintVersionSchema = BlueprintVersionUrlParamsSchema;
export const DownloadBlueprintSchema = BlueprintVersionUrlParamsSchema;
export const ListActivationsForVersionSchema = BlueprintVersionUrlParamsSchema;
export const ListActivationsSchema: SchemaValidate<undefined, { limit?: number }, undefined> = {
    querystring: {
        type: "object",
        properties: {
            limit: { type: "number", minimum: 1, maximum: 10000, nullable: true },
        },
        required: [],
        additionalProperties: false,
    },
};    