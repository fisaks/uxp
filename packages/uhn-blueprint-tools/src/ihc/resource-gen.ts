import type { IHCGroup, IHCIOElement, IHCProduct, IHCResource, UHNResourceType } from "./types";
import type { FactoryMapping, PinOverrides } from "./factory-mapping";
import { resolveFactory, getPinKey } from "./factory-mapping";
import { translateIO, translateLocation, locationToCamelCase } from "./translation";
import { productName, productCategory } from "./product-lookup";

/** IO element type → UHN resource type mapping. */
const IO_TYPE_MAP: Record<string, UHNResourceType> = {
    "dataline_input": "digitalInput",
    "dataline_output": "digitalOutput",
    "airlink_input": "digitalInput",
    "airlink_relay": "digitalOutput",
    "airlink_dimming": "analogOutput",
    "airlink_dimmer_increase": "digitalInput",
    "airlink_dimmer_decrease": "digitalInput",
    "resource_temperature": "analogInput",
};

/**
 * Checks if an IO element should be skipped.
 * Only skips light_indication (wireless product internal feedback, not controllable).
 * LED-type dataline_outputs (button panel indicator LEDs) are included —
 * they are controllable digital outputs useful for status indication.
 */
function shouldSkipIO(io: IHCIOElement): boolean {
    const name = io.name.toLowerCase();
    if (name.includes("lys indikering") || name.includes("light indication")) return true;
    return false;
}

/**
 * Resolves all I/O elements for a group into resource definitions.
 * Handles uniqueness of variable names by appending numeric suffixes.
 */
function resolveResources(
    group: IHCGroup,
    locationPrefix: string,
    pinOverrides: PinOverrides,
    excludedPins?: Set<string>,
): IHCResource[] {
    const resources: IHCResource[] = [];
    const usedNames = new Map<string, number>();

    for (const product of group.products) {
        // Count I/O elements per product to know if we need IO suffixes
        const validIOs = product.ios.filter(io => !shouldSkipIO(io) && IO_TYPE_MAP[io.elementType]);

        for (const io of product.ios) {
            if (shouldSkipIO(io)) continue;
            const pinKey = getPinKey(io.id);
            if (excludedPins?.has(pinKey)) continue;

            const uhnType = IO_TYPE_MAP[io.elementType];
            if (!uhnType) continue;

            const needsIOSuffix = validIOs.length > 1;
            // Check for pin-level name override first
            const nameOverride = pinOverrides[pinKey]?.name;
            let varName = nameOverride
                ? locationPrefix + capitalize(nameOverride)
                : buildVarName(io, product, locationPrefix, needsIOSuffix);

            // Ensure uniqueness by appending numeric suffix
            const count = usedNames.get(varName) ?? 0;
            if (count > 0) {
                varName = `${varName}_${count + 1}`;
            }
            usedNames.set(varName, count + 1);

            const description = buildDescription(io, product);
            resources.push({
                varName,
                pin: io.id,
                uhnType,
                description,
                ioElementType: io.elementType,
                productIdentifier: product.productIdentifier,
                outputType: io.outputType,
            });
        }
    }

    return resources;
}

/**
 * Builds a camelCase variable name from location prefix + product info + IO detail.
 * Examples:
 *   hallLampOutletCeiling
 *   hallPir
 *   kitchenWirelessDimmerLevel
 *   kitchenWirelessDimmerIncrease
 *   hallButtonLeftOfDoorUpperLeft (multi-IO product with position)
 */
function buildVarName(io: IHCIOElement, product: IHCProduct, locationPrefix: string, needsIOSuffix: boolean): string {
    const parts: string[] = [locationPrefix];

    let ioSuffix = inferIOSuffix(io, needsIOSuffix);

    // For multi-IO products where the IO suffix already describes the function
    // (e.g. "buttonUpperLeft", "level", "increase"), use a short product part
    // derived from the IO type instead of the full product name.
    let productPart: string;
    if (ioSuffix && needsIOSuffix) {
        productPart = inferShortProductPart(io, product);
        // Strip redundant prefix from IO suffix when product part covers it
        // e.g. productPart="button", ioSuffix="buttonUpperLeft" → ioSuffix="upperLeft"
        if (productPart && ioSuffix.toLowerCase().startsWith(productPart.toLowerCase())) {
            const rest = ioSuffix.slice(productPart.length);
            if (rest) ioSuffix = rest.charAt(0).toLowerCase() + rest.slice(1);
        }
    } else {
        productPart = inferProductVarPart(product);
    }
    if (productPart) parts.push(capitalize(productPart));

    // Position/detail part
    const positionPart = inferPositionVarPart(product);
    if (positionPart) parts.push(capitalize(positionPart));

    if (ioSuffix) parts.push(capitalize(ioSuffix));

    return parts.join("");
}

/**
 * Infers a short product part for multi-IO products where the IO suffix
 * already carries the meaning. Instead of "comboRelay4ch" + "buttonUpperLeft",
 * we get "button" + "byDoorHall" + "upperLeft".
 *
 * Returns "" to omit when the IO suffix is fully descriptive on its own
 * (e.g. dimmer level/increase/decrease — position alone is enough).
 */
function inferShortProductPart(io: IHCIOElement, product: IHCProduct): string {
    switch (io.elementType) {
        case "airlink_input":
            return "button";
        case "dataline_input": {
            // Only use "button" for actual button/switch products
            const cat = productCategory(product.productIdentifier);
            if (cat === "input") {
                const translated = translateIO(product.name);
                // Return the full product var part for non-button input products
                // (smoke sensors, water sensors, backup modules, etc.)
                if (/button|tryk|knapp/i.test(translated) || /button|tryk|knapp/i.test(product.name)) {
                    return "button";
                }
                return inferProductVarPart(product);
            }
            return "button";
        }
        case "airlink_relay":
            return "relay";
        case "airlink_dimming":
            return "dimmer";
        case "airlink_dimmer_increase":
        case "airlink_dimmer_decrease":
            return "dimmer";
        case "resource_temperature":
            return "temp";
        default:
            return inferProductVarPart(product);
    }
}

/**
 * Infers the product part of the variable name from the product type.
 */
function inferProductVarPart(product: IHCProduct): string {
    const translated = translateIO(product.name);

    switch (translated) {
        case "outlet": return "socket";
        case "lamp-outlet":
        case "lighting": return "light";
        case "pir": return "pir";
        case "button-2-way": return "button";
        case "button-4-way": return "button";
        case "button-6-way": return "button";
        case "status-button-4-way": return "statusButton";
        case "night-led": return "nightLight";
        case "wireless-dimmer-4ch": return "wirelessDimmer";
        case "wireless-relay-4ch": return "wirelessRelay";
        case "wireless-dimmer-2ch": return "wirelessDimmer";
        case "wireless-button-6ch": return "wirelessButton";
        case "wireless-blind-dimmer": return "wirelessDimmerBlind";
        case "wireless-blind-relay": return "wirelessRelayBlind";
        case "sounder-internal": return "sounderInternal";
        case "sounder-external": return "sounderExternal";
        default:
            // Use translated product name, camelCased
            return toCamelCase(translated);
    }
}

/**
 * Infers a position/detail part from product position attribute.
 */
function inferPositionVarPart(product: IHCProduct): string {
    if (!product.position) return "";

    const translated = translateIO(product.position);
    if (translated !== product.position) {
        return toCamelCase(translated);
    }
    // No translation — try to use position as-is if short enough
    if (product.position.length < 40) {
        return toCamelCase(sanitizeForVar(product.position));
    }
    return "";
}

/**
 * Infers IO-specific suffix for distinguishing multiple IO elements per product.
 * When needsIOSuffix is true (multi-IO product), always produces a suffix.
 */
function inferIOSuffix(io: IHCIOElement, needsIOSuffix: boolean): string {
    // These element types always need a suffix to distinguish from each other
    switch (io.elementType) {
        case "airlink_dimming": return "level";
        case "airlink_dimmer_increase": return "increase";
        case "airlink_dimmer_decrease": return "decrease";
        case "airlink_relay": return "relay";
        case "resource_temperature": {
            const translated = translateIO(io.name);
            if (translated === "room-temperature") return "roomTemp";
            if (translated === "floor-temperature") return "floorTemp";
            if (translated === "setpoint-temperature" || translated === "setpoint-home") return "setpoint";
            return toCamelCase(translated);
        }
    }

    if (!needsIOSuffix) {
        // Single-IO product — no suffix needed
        const translated = translateIO(io.name);
        if (translated === "presence-detection" || translated === "presence") return "";
        if (translated === "output" || translated === "input") return "";
        return "";
    }

    // Multi-IO product — always produce a suffix from the IO name
    const translated = translateIO(io.name);
    if (translated.startsWith("button-")) return toCamelCase(translated);
    if (translated === "output" || translated === "input") return io.elementType.split("_").pop()!;
    if (translated === "presence-detection" || translated === "presence") return "presence";

    return toCamelCase(sanitizeForVar(translated)) || io.elementType.split("_").pop()!;
}

/**
 * Builds a human-readable description for the resource.
 */
function buildDescription(io: IHCIOElement, product: IHCProduct): string {
    const prodName = productName(product.productIdentifier);
    const parts: string[] = [prodName];

    if (product.position) parts.push(`— ${product.position}`);

    const ioName = translateIO(io.name);
    if (ioName && ioName !== "output" && ioName !== "input") {
        parts.push(`(${ioName})`);
    }


    return parts.join(" ");
}

/**
 * Generates a TypeScript resource file for one location+controller combination.
 */
export function generateResourceFile(
    group: IHCGroup,
    controller: string,
    edge: string,
    mapping: FactoryMapping,
    pinOverrides: PinOverrides,
    autoExport?: boolean,
    excludedPins?: Set<string>,
): string {
    const locationEnglish = translateLocation(group.name);
    const locationPrefix = locationToCamelCase(locationEnglish);
    const lines: string[] = [];

    // Resolve all resources for this group (handles name uniqueness)
    const resources = resolveResources(group, locationPrefix, pinOverrides, excludedPins);

    if (resources.length === 0) return "";

    // Collect imports grouped by import path
    const importsByPath = new Map<string, Set<string>>();

    function addImport(importPath: string, name: string) {
        if (!importsByPath.has(importPath)) importsByPath.set(importPath, new Set());
        importsByPath.get(importPath)!.add(name);
    }

    for (const res of resources) {
        const ref = resolveFactory(mapping, res.ioElementType, res.productIdentifier, res.pin, pinOverrides);
        addImport(ref.import, ref.factory);
    }

    // Write imports
    for (const [importPath, names] of [...importsByPath].sort((a, b) => a[0].localeCompare(b[0]))) {
        const nameList = [...names].sort().join(", ");
        lines.push(`import { ${nameList} } from "${importPath}";`);
    }
    lines.push("");

    // Header comment
    lines.push(`// ${group.name} — IHC controller: ${controller}`);
    lines.push(`// Add // @keep to any property line to preserve it across re-imports`);
    lines.push("");

    const exportKeyword = autoExport ? "export " : "";

    // Generate resource constants
    for (const res of resources) {
        const ref = resolveFactory(mapping, res.ioElementType, res.productIdentifier, res.pin, pinOverrides);
        const needsKind = isBaseFactory(ref.factory);

        lines.push(`${exportKeyword}const ${res.varName} = ${ref.factory}({`);
        lines.push(`    edge: "${edge}",`);
        lines.push(`    device: "${controller}",`);
        lines.push(`    pin: 0x${res.pin.toString(16).toUpperCase()},`);
        lines.push(`    description: ${JSON.stringify(res.description)},`);

        // Add kind properties when using base factories
        if (needsKind) {
            const kind = inferKind(res);
            if (kind) lines.push(`    ${kind}`);
        }

        // Add icon: pin-mapping/factory-mapping override > product-based inference
        const icon = ref.icon ?? inferIcon(res);
        if (icon) lines.push(`    icon: "${icon}",`);

        // Add keywords for specific patterns
        const keywords = inferKeywords(res);
        if (keywords.length > 0) {
            lines.push(`    keywords: [${keywords.map(k => JSON.stringify(k)).join(", ")}],`);
        }

        lines.push(`});`);
        lines.push("");
    }

    return lines.join("\n");
}

/** Base factory names from @uhn/blueprint that need kind properties. */
const BASE_FACTORIES = new Set(["digitalOutput", "digitalInput", "analogInput", "analogOutput"]);

function isBaseFactory(factory: string): boolean {
    return BASE_FACTORIES.has(factory);
}

/** Infers an icon for specific product types. Returns null for most resources. */
/** Infers keywords for specific resource patterns. */
function inferKeywords(res: IHCResource): string[] {
    const keywords: string[] = [];
    if (/spot/i.test(res.varName) && res.uhnType === "analogOutput") {
        keywords.push("downlight");
    }
    return keywords;
}

function inferIcon(res: IHCResource): string | null {
    switch (res.productIdentifier) {
        case 0x2203: return "sensor:sound";        // Alarm sounder internal
        case 0x2204: return "sensor:sound";        // Alarm sounder external
        case 0x2209: return "sensor:doorbell";    // Doorbell
        case 0x2113: return "sensor:doorbell";    // Doorbell button
        case 0x210a: return "sensor:smoke";       // Smoke sensor
        case 0x2109: return "opening:door";       // Door contact
        case 0x2111: return "opening:window";     // Window contact
        case 0x2701: return /glass/i.test(res.varName) ? "sensor:vibration" : "sensor:leak";
        case 0x210e: return "sensor:pir";         // PIR sensor
        case 0x210f: return "sensor:pir";         // PIR alarm
        case 0x2120: return "sensor:pir";         // PIR single input
        case 0x2110: return "sensor:dark";        // Twilight sensor
        case 0x2115: return "energy:battery";     // Backup module
        case 0x2112: return "sensor:alarm";       // Tamper circuit
        default: return null;
    }
}

function inferKind(res: IHCResource): string | null {
    switch (res.uhnType) {
        case "digitalOutput":
            if (res.ioElementType === "dataline_output" && res.outputType === "led") {
                return `outputKind: "light",`;
            }
            return `outputKind: "relay",`;
        case "digitalInput": {
            // Toggle-type inputs: door/window contacts, twilight sensors, smoke sensors, backup modules
            const toggleProducts = new Set([0x2109, 0x2111, 0x2110, 0x210a, 0x2112, 0x2115, 0x2701]);
            const inputType = toggleProducts.has(res.productIdentifier) ? "toggle" : "push";
            return `inputKind: "sensor", inputType: "${inputType}",`;
        }
        case "analogOutput":
            return `analogOutputKind: "dimmer", min: 0, max: 100, unit: "%",`;
        case "analogInput":
            return `analogInputKind: "temperature", unit: "°C", decimalPrecision: 1,`;
        default:
            return null;
    }
}

/**
 * Returns all mapping keys used by resources in a group.
 * Includes both product-specific and generic keys.
 * Map values are product names (for human-readable metadata in the JSON).
 */
export function collectMappingKeys(groups: IHCGroup[]): Map<string, string | undefined> {
    const keys = new Map<string, string | undefined>();
    for (const group of groups) {
        for (const product of group.products) {
            for (const io of product.ios) {
                if (shouldSkipIO(io)) continue;
                if (!IO_TYPE_MAP[io.elementType]) continue;

                // Generic key (no product name)
                if (!keys.has(io.elementType)) {
                    keys.set(io.elementType, undefined);
                }
                // Product-specific key (with product name)
                const specificKey = `0x${product.productIdentifier.toString(16)}.${io.elementType}`;
                if (!keys.has(specificKey)) {
                    keys.set(specificKey, productName(product.productIdentifier));
                }
            }
        }
    }
    return keys;
}

/**
 * Generates the file name for a location+controller resource file.
 * Example: "hall-ihc2.ts"
 */
export function locationToFileName(groupName: string, controller: string): string {
    const locationEnglish = translateLocation(groupName);
    return `${locationEnglish}-${controller}`;
}

// --- Utility functions ---

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function toCamelCase(s: string): string {
    return s
        .replace(/[^a-zA-Z0-9]+(\w)/g, (_, c) => c.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, "");
}

function sanitizeForVar(s: string): string {
    return s
        .replace(/[åÅ]/g, "a")
        .replace(/[äÄ]/g, "a")
        .replace(/[öÖ]/g, "o")
        .replace(/[üÜ]/g, "u")
        .replace(/[éÉ]/g, "e")
        .replace(/[æÆ]/g, "ae")
        .replace(/[øØ]/g, "o")
        .replace(/[^a-zA-Z0-9\s-]/g, "");
}
