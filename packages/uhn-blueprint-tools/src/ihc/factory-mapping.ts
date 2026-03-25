import fs from "fs";
import path from "path";

const IHC_DIR = ".ihc";
const MAPPING_FILE = "factory-mapping.json";
const PIN_OVERRIDES_FILE = "pin-overrides.json";
/** @deprecated Use pin-overrides.json instead */
const LEGACY_PIN_MAPPING_FILE = "pin-mapping.json";
/** @deprecated Use pin-overrides.json instead */
const LEGACY_NAME_OVERRIDES_FILE = "name-overrides.json";

export type FactoryRef = {
    factory: string;
    import: string;
    /** Product name for human readability (not used at runtime). */
    product?: string;
    /** Override icon for this resource (BlueprintIcon name). */
    icon?: string;
};

export type FactoryMapping = Record<string, FactoryRef>; // key → { factory, import, product? }

/**
 * Loads the factory mapping from .ihc/factory-mapping.json.
 * Returns empty mapping if file doesn't exist.
 */
export function loadFactoryMapping(): FactoryMapping {
    const mappingPath = path.join(IHC_DIR, MAPPING_FILE);
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
    fs.mkdirSync(IHC_DIR, { recursive: true });
    const mappingPath = path.join(IHC_DIR, MAPPING_FILE);
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 4) + "\n");
}

/** Per-pin override — all fields optional, only specified fields override defaults. */
export type PinOverride = {
    factory?: string;
    import?: string;
    icon?: string;
    name?: string;
    product?: string;
};

export type PinOverrides = Record<string, PinOverride>;

/**
 * Loads pin-overrides.json (merged pin-mapping + name-overrides).
 * Falls back to reading legacy pin-mapping.json and name-overrides.json if the
 * unified file doesn't exist yet.
 */
export function loadPinOverrides(): PinOverrides {
    const overridesPath = path.join(IHC_DIR, PIN_OVERRIDES_FILE);
    if (fs.existsSync(overridesPath)) {
        try {
            return JSON.parse(fs.readFileSync(overridesPath, "utf-8"));
        } catch {
            return {};
        }
    }

    // Legacy fallback: merge pin-mapping.json + name-overrides.json
    const merged: PinOverrides = {};
    const legacyPinPath = path.join(IHC_DIR, LEGACY_PIN_MAPPING_FILE);
    if (fs.existsSync(legacyPinPath)) {
        try {
            const pinMapping = JSON.parse(fs.readFileSync(legacyPinPath, "utf-8")) as Record<string, any>;
            for (const [key, val] of Object.entries(pinMapping)) {
                merged[key] = { ...val };
            }
        } catch { /* ignore */ }
    }
    const legacyNamePath = path.join(IHC_DIR, LEGACY_NAME_OVERRIDES_FILE);
    if (fs.existsSync(legacyNamePath)) {
        try {
            const nameOverrides = JSON.parse(fs.readFileSync(legacyNamePath, "utf-8")) as Record<string, string>;
            for (const [key, name] of Object.entries(nameOverrides)) {
                if (merged[key]) {
                    merged[key].name = name;
                } else {
                    merged[key] = { name };
                }
            }
        } catch { /* ignore */ }
    }
    return merged;
}

/**
 * Ensures the mapping has entries for all used keys.
 * New entries default to base factories from @uhn/blueprint.
 * Existing entries are preserved (author-editable).
 *
 * Keys use the format:
 * - `{io_element_type}` for generic defaults
 * - `0x{product_identifier}.{io_element_type}` for product-specific overrides
 */
export function ensureMappingDefaults(
    mapping: FactoryMapping,
    keys: Map<string, string | undefined>,
): FactoryMapping {
    let added = 0;

    for (const [key, prodName] of keys) {
        if (!mapping[key]) {
            const ref = defaultFactory(key);
            if (prodName) ref.product = prodName;
            mapping[key] = ref;
            added++;
        }
    }

    if (added > 0) {
        console.log(`  Added ${added} new entries to factory mapping`);
    }

    return mapping;
}

/**
 * Returns the factory mapping key for a given io element type and product.
 * Product-specific overrides take precedence over generic defaults.
 */
export function getMappingKey(ioElementType: string, productIdentifier: number): string {
    return `0x${productIdentifier.toString(16)}.${ioElementType}`;
}

export function getGenericKey(ioElementType: string): string {
    return ioElementType;
}

/**
 * Resolves the factory for an IO element.
 * Lookup order: pin-override (factory/import) → product-specific → generic → default.
 * Then pin-override icon overlays the resolved factory's icon.
 */
export function resolveFactory(
    mapping: FactoryMapping,
    ioElementType: string,
    productIdentifier: number,
    pin?: number,
    pinOverrides?: PinOverrides,
): FactoryRef {
    const pinKey = pin !== undefined ? getPinKey(pin) : undefined;
    const pinOv = pinKey && pinOverrides ? pinOverrides[pinKey] : undefined;

    // Pin-level factory override (only if both factory and import are specified)
    if (pinOv?.factory && pinOv?.import) {
        return {
            factory: pinOv.factory,
            import: pinOv.import,
            icon: pinOv.icon,
            product: pinOv.product,
        };
    }

    // Product-specific override (e.g. "0x2202.dataline_output")
    const specificKey = getMappingKey(ioElementType, productIdentifier);
    let ref: FactoryRef | undefined;
    if (mapping[specificKey]) ref = mapping[specificKey];

    // Generic fallback (e.g. "dataline_output")
    if (!ref) {
        const genericKey = getGenericKey(ioElementType);
        ref = mapping[genericKey] ?? defaultFactory(genericKey);
    }

    // Overlay pin-level icon if set (even without factory override)
    if (pinOv?.icon) {
        return { ...ref, icon: pinOv.icon };
    }

    return ref;
}

/** Returns the pin-specific mapping key for a resource ID. */
export function getPinKey(pin: number): string {
    return `0x${pin.toString(16).toUpperCase()}`;
}

/** Default factory for a given key. Uses product ID for smarter defaults. */
function defaultFactory(key: string): FactoryRef {
    // Extract the IO element type and optional product ID
    // Key format: "ioType" or "0xPRODUCT.ioType"
    const ioType = key.includes(".") ? key.split(".").pop()! : key;

    switch (ioType) {
        case "dataline_output":
            return { factory: "digitalOutput", import: "@uhn/blueprint" };
        case "dataline_input":
            return { factory: "digitalInput", import: "@uhn/blueprint" };
        case "airlink_input":
            return { factory: "digitalInput", import: "@uhn/blueprint" };
        case "airlink_relay":
            return { factory: "digitalOutput", import: "@uhn/blueprint" };
        case "airlink_dimming":
            return { factory: "analogOutput", import: "@uhn/blueprint" };
        case "airlink_dimmer_increase":
            return { factory: "digitalInput", import: "@uhn/blueprint" };
        case "airlink_dimmer_decrease":
            return { factory: "digitalInput", import: "@uhn/blueprint" };
        case "resource_temperature":
            return { factory: "analogInput", import: "@uhn/blueprint" };
        default:
            return { factory: "digitalOutput", import: "@uhn/blueprint" };
    }
}
