import fs from "fs-extra";
import path from "path";

const IDENTIFIER_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export function validateBlueprintMetadata(projectRoot: string): void {
    const blueprintPath = path.join(projectRoot, "blueprint.json");

    if (!fs.existsSync(blueprintPath)) {
        throw new Error("blueprint.json is missing at project root");
    }

    let data: any;
    try {
        data = fs.readJsonSync(blueprintPath);
    } catch {
        throw new Error("blueprint.json is not valid JSON");
    }

    const errors: string[] = [];

    // identifier
    if (typeof data.identifier !== "string" || !data.identifier.trim()) {
        errors.push(`"identifier" must be a non-empty string`);
    } else if (!IDENTIFIER_REGEX.test(data.identifier)) {
        errors.push(
            `"identifier" "${data.identifier}" contains invalid characters`
        );
    }

    // name
    if (typeof data.name !== "string" || !data.name.trim()) {
        errors.push(`"name" must be a non-empty string`);
    }

    // description
    if (
        data.description !== undefined &&
        typeof data.description !== "string"
    ) {
        errors.push(`"description" must be a string if provided`);
    }

    // schemaVersion
    if (typeof data.schemaVersion !== "number") {
        errors.push(`"schemaVersion" must be a number`);
    } else if (!Number.isInteger(data.schemaVersion)) {
        errors.push(`"schemaVersion" must be an integer`);
    } else if (data.schemaVersion !== 1) {
        errors.push(
            `"schemaVersion" ${data.schemaVersion} is not supported (expected 1)`
        );
    }

    // unknown fields
    const allowedKeys = new Set([
        "identifier",
        "name",
        "description",
        "schemaVersion",
    ]);

    for (const key of Object.keys(data)) {
        if (!allowedKeys.has(key)) {
            errors.push(`Unknown field "${key}" in blueprint.json`);
        }
    }

    if (errors.length) {
        throw new Error(
            "Invalid blueprint.json:\n\n" +
            errors.map(e => `- ${e}`).join("\n")
        );
    }
}
