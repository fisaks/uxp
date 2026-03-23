import type { ParsedDevice, UHNProperty } from "./types";
import { capitalize, deviceToVarPrefix, resourceVarName } from "./naming";

/**
 * Generates a view TypeScript file for a Z2M device.
 * Auto-wires stateFrom from writable binary property, toggle command.
 * Display-only for sensor devices (no writable binary).
 */
export function generateViewFile(device: ParsedDevice, resourceFileName: string): string {
    const prefix = deviceToVarPrefix(device.friendlyName);
    const lines: string[] = [];

    // Find primary state (writable binary/ON-OFF enum)
    const primaryState = device.properties.find(p =>
        (p.uhnType === "digitalOutput") && p.writable
    );

    // Display properties: only readable state values, exclude primary state,
    // config properties, and linkquality
    const displayProps = device.properties.filter(p =>
        p !== primaryState &&
        p.category !== "config" && // exclude device config (calibration, comfort thresholds, etc.)
        (p.access & 1) !== 0 // readable
    );

    // Sort: temperature, humidity first, battery last
    displayProps.sort((a, b) => propOrder(a) - propOrder(b));

    // Collect import names
    const importNames: string[] = [];
    if (primaryState) importNames.push(resourceVarName(prefix, primaryState.pin));
    for (const p of displayProps) importNames.push(resourceVarName(prefix, p.pin));

    lines.push(`import { view } from "@uhn/blueprint";`);
    lines.push(`import {`);
    for (const name of importNames) {
        lines.push(`    ${name},`);
    }
    lines.push(`} from "../resources/${resourceFileName}";`);
    lines.push("");

    const viewVarName = `view${capitalize(prefix)}`;
    const desc = device.description ?? device.friendlyName.replace(/_/g, " ");

    lines.push(`export const ${viewVarName} = view({`);

    if (primaryState) {
        const stateVar = resourceVarName(prefix, primaryState.pin);
        lines.push(`    stateFrom: [{ resource: ${stateVar} }],`);
        lines.push(`    command: { resource: ${stateVar}, type: "toggle" },`);
    } else {
        lines.push(`    stateFrom: [],`);
    }

    if (displayProps.length > 0) {
        lines.push(`    stateDisplay: {`);
        lines.push(`        items: [`);
        for (const p of displayProps) {
            const varName = resourceVarName(prefix, p.pin);
            lines.push(`            { resource: ${varName}, label: ${JSON.stringify(p.label)} },`);
        }
        lines.push(`        ],`);
        lines.push(`    },`);
    }

    const icon = selectIcon(device, primaryState);
    lines.push(`    icon: "${icon}",`);
    lines.push(`    description: ${JSON.stringify(desc)},`);
    lines.push(`});`);
    lines.push("");

    return lines.join("\n");
}

function propOrder(p: UHNProperty): number {
    switch (p.pin) {
        case "temperature": return 0;
        case "humidity": return 1;
        case "power": return 2;
        case "voltage": return 3;
        case "current": return 4;
        case "energy": return 5;
        case "battery": return 99;
        default: return 50;
    }
}

function selectIcon(device: ParsedDevice, primaryState?: UHNProperty): string {
    if (primaryState) {
        const desc = (device.description ?? "").toLowerCase();
        const hasLightProps = device.properties.some(p =>
            p.pin === "brightness" || p.pin === "color_temp" || p.pin === "color"
        );
        if (hasLightProps || /\b(light|led|bulb|lamp)\b/.test(desc)) return "lighting:bulb";
        return "power:socket";
    }
    const hasTemp = device.properties.some(p => p.pin === "temperature");
    if (hasTemp) return "sensor:temperature";
    return "status:device";
}
