import { SchemaValidate } from "@uxp/common";
import { BuildingPatchPayload, HousePatchPayload } from "../types/house.types";

export const HousePatchSchema: SchemaValidate<HousePatchPayload, undefined, { uuid: string }> = {
    body: {
        type: "object",
        properties: {
            key: {
                type: "string",
                pattern:
                    [
                        "^(",
                        "name|",
                        "address|",
                        "yearBuilt|",
                        "legalRegistrationNumber|",
                        "details\\.[\\p{Any}]{1,50}|",
                        "buildings\\[\\d+\\]\\.yearBuilt|",
                        "buildings\\[\\d+\\]\\.name|",
                        "buildings\\[\\d+\\]\\.details\\.[\\p{Any}]{1,50}",
                        ")$"
                    ].join("")
            },
            value: { type: "string", nullable: true, maxLength: 512 }, // Allow any value type
        },
        required: ["key"],
        additionalProperties: false,
    },
    params: {
        type: "object",
        properties: {
            uuid: { type: "string", format: "uuid" },
        },
        required: ["uuid"],
    },
};

export const BuildingPatchSchema: SchemaValidate<BuildingPatchPayload, undefined, { uuidHouse: string, uuidBuilding: string }> = {
    body: {
        type: "object",
        properties: {
            key: {
                type: "string",
                pattern:
                    [
                        "^(",
                        "name|",
                        "yearBuilt|",
                        "details\\.[\\p{Any}]{1,50}|",
                        ")$"
                    ].join("")
            },
            value: { type: "string", nullable: true, maxLength: 512 }, // Allow any value type
        },
        required: ["key"],
        additionalProperties: false,
    },
    params: {
        type: "object",
        properties: {
            uuidHouse: { type: "string", format: "uuid" },
            uuidBuilding: { type: "string", format: "uuid" },
        },
        required: ["uuidHouse", "uuidBuilding"],
    },
};

export const HouseGetSchema: SchemaValidate<undefined, undefined, { uuid: string }> = {
    params: {
        type: "object",
        properties: {
            uuid: { type: "string", format: "uuid" },
        },
        required: ["uuid"],
    },
};
export const HouseDeleteSchema = HouseGetSchema;
export const AddBuildingSchema = HouseGetSchema;
export const RemoveBuildingSchema: SchemaValidate<undefined, undefined, { uuidHouse: string; uuidBuilding: string }> = {
    params: {
        type: "object",
        properties: {
            uuidHouse: { type: "string", format: "uuid" },
            uuidBuilding: { type: "string", format: "uuid" },
        },
        required: ["uuidHouse", "uuidBuilding"],
    },
};
