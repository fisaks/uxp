import fs from "fs";
import path from "path";

const Z2M_DIR = ".z2m";
const MAPPING_FILE = "factory-mapping.json";

export type FactoryRef = {
    factory: string;
    import: string;
};

export type FactoryMapping = Record<string, FactoryRef>; // "uhnType.kind" → { factory, import }

/**
 * Loads the factory mapping from .z2m-data/factory-mapping.json.
 * Returns empty mapping if file doesn't exist.
 */
export function loadFactoryMapping(): FactoryMapping {
    const mappingPath = path.join(Z2M_DIR, MAPPING_FILE);
    if (fs.existsSync(mappingPath)) {
        try {
            return JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
        } catch {
            return {};
        }
    }
    return {};
}

/**
 * Saves the factory mapping. Preserves author edits — only adds new keys.
 */
export function saveFactoryMapping(mapping: FactoryMapping): void {
    fs.mkdirSync(Z2M_DIR, { recursive: true });
    const mappingPath = path.join(Z2M_DIR, MAPPING_FILE);
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 4) + "\n");
}

/**
 * Ensures the mapping has entries for all used type+kind combinations.
 * New entries default to base factories from @uhn/blueprint.
 * Existing entries are preserved (author-editable).
 */
export function ensureMappingDefaults(
    mapping: FactoryMapping,
    keys: Set<string>,
): FactoryMapping {
    let added = 0;

    for (const key of keys) {
        if (!mapping[key]) {
            mapping[key] = {
                factory: defaultFactoryName(key),
                import: "@uhn/blueprint",
            };
            added++;
        }
    }

    if (added > 0) {
        console.log(`  📋 Added ${added} new entries to factory mapping`);
    }

    return mapping;
}

/** Generates the default zigbee factory function name for a type.kind key. */
function defaultFactoryName(key: string): string {
    const [uhnType, kind] = key.split(".");
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    switch (uhnType) {
        case "digitalOutput":
            return "digitalOutput";
        case "digitalInput":
            return "digitalInput";
        case "analogInput":
            return "analogInput";
        case "analogOutput":
            return "analogOutput";
        case "actionInput":
            return "actionInput";
        case "actionOutput":
            return "actionOutput";
        default:
            return uhnType;
    }
}
