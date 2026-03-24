import type { Z2MExpose, UHNProperty, UHNResourceType } from "./types";

/**
 * Parses Z2M expose definitions into UHN property descriptors.
 * Recurses into features for composite and specific types (switch, light, etc.).
 */
export function parseExposes(exposes: Z2MExpose[], prefix: string = ""): UHNProperty[] {
    const properties: UHNProperty[] = [];

    for (const expose of exposes) {
        // Skip config composites — by category or known name
        if (expose.category === "config") continue;
        const compositeName = expose.property ?? expose.name ?? "";
        if (["level_config", "color_options"].includes(compositeName)) continue;

        // Recurse into features for all types that have them
        if (expose.features && expose.features.length > 0) {
            const subPrefix = expose.type === "composite"
                ? (prefix ? `${prefix}.${expose.property}` : expose.property ?? "")
                : prefix;
            properties.push(...parseExposes(expose.features, subPrefix));
            continue;
        }

        const prop = expose.property ?? expose.name;
        if (!prop) continue;

        // Skip Z2M internal, diagnostic, and config-by-name properties
        const skipNames = ["update", "last_seen", "linkquality", "identify"];
        const skipSuffixes = ["_startup"]; // startup config properties (color_temp_startup, etc.)
        const skipPrefixes = ["level_config"]; // Zigbee cluster config composites
        if (skipNames.includes(prop)) continue;
        if (skipSuffixes.some(s => prop.endsWith(s))) continue;
        if (skipPrefixes.some(p => prop === p || (prefix && prefix.startsWith(p)))) continue;

        const access = expose.access ?? 0;
        const writable = (access & 2) !== 0;
        const readable = (access & 1) !== 0;

        // Write-only non-ON/OFF enum → actionOutput (transient fire-and-forget commands like light effects)
        if (expose.type === "enum" && writable && !readable && expose.values && expose.values.length > 0 && !isOnOffEnum(expose.values)) {
            const pin = prefix ? `${prefix}.${prop}` : prop;
            properties.push({
                pin,
                uhnType: "actionOutput",
                description: expose.description,
                label: expose.label ?? capitalize(prop.replace(/_/g, " ")),
                access,
                category: expose.category,
                writable: true,
                isOnOff: false,
                actionValues: expose.values,
            });
            continue;
        }

        // Skip write-only properties (access === 2) — device config, not runtime state
        if (access === 2) continue;

        // Skip config-category properties — device settings, not runtime state
        if (expose.category === "config") continue;

        const pin = prefix ? `${prefix}.${prop}` : prop;

        // Action property: read-only enum named "action" with values → transient event
        if (expose.type === "enum" && !writable && prop === "action" && expose.values && expose.values.length > 0 && !isOnOffEnum(expose.values)) {
            properties.push({
                pin,
                uhnType: "actionInput",
                description: expose.description,
                label: expose.label ?? capitalize(prop.replace(/_/g, " ")),
                access,
                category: expose.category,
                writable: false,
                isOnOff: false,
                actionValues: expose.values,
            });
            continue;
        }

        const uhnType = mapExposeType(expose.type, writable, expose.values);
        if (!uhnType) continue;

        properties.push({
            pin,
            uhnType,
            unit: expose.unit,
            description: expose.description,
            label: expose.label ?? capitalize(prop.replace(/_/g, " ")),
            min: expose.value_min,
            max: expose.value_max,
            step: expose.value_step,
            access,
            category: expose.category,
            writable,
            isOnOff: expose.type === "enum" && isOnOffEnum(expose.values),
            presets: expose.presets,
        });
    }

    return properties;
}

function mapExposeType(z2mType: string, writable: boolean, values?: string[]): UHNResourceType | undefined {
    switch (z2mType) {
        case "binary":
            return writable ? "digitalOutput" : "digitalInput";
        case "numeric":
            return writable ? "analogOutput" : "analogInput";
        case "enum":
            if (isOnOffEnum(values)) {
                return writable ? "digitalOutput" : "digitalInput";
            }
            if (writable) return "analogOutput";
            // Read-only enums — no UHN state type mapping
            return undefined;
        default:
            return undefined;
    }
}

function isOnOffEnum(values?: string[]): boolean {
    if (!values) return false;
    return values.includes("ON") && values.includes("OFF");
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
