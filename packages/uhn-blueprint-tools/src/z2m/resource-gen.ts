import type { ParsedDevice, UHNProperty } from "./types";
import type { FactoryMapping } from "./factory-mapping";
import { capitalize, deviceToVarPrefix, resourceVarName } from "./naming";

/**
 * Generates a resource TypeScript file for a Z2M device.
 * Uses factory mapping to resolve which factory function and import path to use.
 */
export function generateResourceFile(device: ParsedDevice, edge: string, mapping: FactoryMapping, autoExport?: boolean): string {
    const prefix = deviceToVarPrefix(device.friendlyName);
    const lines: string[] = [];
    const edgeConst = `EDGE_${edge.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_ZIGBEE`;
    const defaultImport = `../factory/zigbee-factory-${edge}`;

    // Collect imports grouped by import path
    const importsByPath = new Map<string, Set<string>>();

    function addImport(importPath: string, name: string) {
        if (!importsByPath.has(importPath)) importsByPath.set(importPath, new Set());
        importsByPath.get(importPath)!.add(name);
    }

    // Edge const always comes from the zigbee factory
    addImport(defaultImport, edgeConst);

    for (const prop of device.properties) {
        const ref = resolveFactory(prop, device, mapping);
        addImport(ref.import, ref.factory);
    }

    // Write imports
    for (const [importPath, names] of [...importsByPath].sort((a, b) => a[0].localeCompare(b[0]))) {
        const nameList = [...names].sort().join(", ");
        lines.push(`import { ${nameList} } from "${importPath}";`);
    }
    lines.push("");

    if (device.description) {
        lines.push(`// ${device.description} (Z2M: ${device.friendlyName})`);
    } else {
        lines.push(`// Z2M device: ${device.friendlyName}`);
    }
    lines.push("");

    // Generate action union + per-action metadata map for actionInput devices (author-editable)
    const hasActionInput = device.properties.some(p => p.uhnType === "actionInput" && p.actionValues?.length);
    if (hasActionInput) {
        const actionUnionName = `${capitalize(prefix)}Actions`;
        const metaName = `${capitalize(prefix)}Meta`;
        const actionValues = device.properties
            .filter(p => p.uhnType === "actionInput" && p.actionValues?.length)
            .flatMap(p => p.actionValues!);
        lines.push(`// Unfiltered from Z2M — Zigbee-bound devices may silently consume some actions.`);
        lines.push(`type ${actionUnionName} = ${actionValues.map(a => `"${a}"`).join(" | ")};`);
        lines.push(``);
        lines.push(`/** Per-action metadata. Change \`never\` to the metadata type for actions`);
        lines.push(` *  that carry action_* fields (check runtime logs to discover them). */`);
        lines.push(`type ${metaName} = {`);
        for (const action of actionValues) {
            lines.push(`    "${action}": never;`);
        }
        lines.push(`};`);
        lines.push("");
    }

    const exportKeyword = autoExport ? "export " : "";

    for (const prop of device.properties) {
        const varName = resourceVarName(prefix, prop.pin);
        const ref = resolveFactory(prop, device, mapping);
        const props = buildProps(prop, device, edgeConst);
        const numericPresets = (prop.presets ?? []).filter(p => typeof p.value === "number");

        // ActionInput: add generic type parameter for action union
        let genericSuffix = "";
        if (prop.uhnType === "actionInput" && prop.actionValues?.length) {
            genericSuffix = `<${capitalize(prefix)}Actions, ${capitalize(prefix)}Meta>`;
        }

        lines.push(`${exportKeyword}const ${varName} = ${ref.factory}${genericSuffix}({`);
        for (const p of props) {
            lines.push(`    ${p}`);
        }
        if (numericPresets.length > 0) {
            const optionsStr = numericPresets
                .map(p => `{ value: ${p.value}, label: ${JSON.stringify(capitalize(p.name))} }`)
                .join(", ");
            lines.push(`    // Uncomment for preset picker instead of slider:`);
            lines.push(`    // options: [${optionsStr}],`);
        }
        lines.push(`});`);
        lines.push("");
    }

    return lines.join("\n");
}

/** Returns the mapping key for a property. */
export function getMappingKey(prop: UHNProperty, device: ParsedDevice): string {
    switch (prop.uhnType) {
        case "digitalOutput":
            return `digitalOutput.${inferOutputKind(prop, device)}`;
        case "digitalInput":
            return `digitalInput.${inferInputKind(prop)}`;
        case "analogInput":
            return `analogInput.${mapAnalogInputKind(prop.pin, prop.unit)}`;
        case "analogOutput":
            return `analogOutput.${mapAnalogOutputKind(prop.pin)}`;
        case "actionInput":
            return `actionInput.${inferActionInputKind(device)}`;
    }
}

function resolveFactory(prop: UHNProperty, device: ParsedDevice, mapping: FactoryMapping): { factory: string; import: string } {
    const key = getMappingKey(prop, device);
    const ref = mapping[key];
    if (ref) return ref;
    // actionInput defaults to base actionInput() from @uhn/blueprint (not a generated zigbee factory)
    if (prop.uhnType === "actionInput") return { factory: "actionInput", import: "@uhn/blueprint" };
    return { factory: key, import: "@uhn/blueprint" };
}

function buildProps(prop: UHNProperty, device: ParsedDevice, edgeConst: string): string[] {
    const deviceName = device.friendlyName;
    const props: string[] = [];
    props.push(`device: "${deviceName}",`);
    props.push(`pin: "${prop.pin}",`);
    props.push(`edge: ${edgeConst},`);
    if (prop.description) {
        props.push(`description: ${JSON.stringify(prop.description)},`);
    }
    if (prop.uhnType === "analogOutput") {
        if (prop.unit) props.push(`unit: ${JSON.stringify(prop.unit)},`);
        if (prop.min !== undefined) props.push(`min: ${prop.min},`);
        if (prop.max !== undefined) props.push(`max: ${prop.max},`);
        if (prop.step !== undefined) props.push(`step: ${prop.step},`);
    }
    if (prop.uhnType === "analogInput") {
        if (prop.unit) props.push(`unit: ${JSON.stringify(prop.unit)},`);
        const precision = suggestDecimalPrecision(prop.pin, prop.unit);
        if (precision !== undefined) props.push(`decimalPrecision: ${precision},`);
    }
    if (prop.uhnType === "actionInput" && prop.actionValues?.length) {
        props.push(`actionInputKind: "${inferActionInputKind(device)}",`);
        props.push(`actions: [`);
        for (const action of prop.actionValues) {
            props.push(`    "${action}",`);
        }
        props.push(`],`);
    }
    return props;
}

function inferOutputKind(prop: UHNProperty, device: ParsedDevice): string {
    if (prop.pin !== "state") return "relay";
    const desc = (device.description ?? "").toLowerCase();
    const hasLightProps = device.properties.some(p =>
        p.pin === "brightness" || p.pin === "color_temp" || p.pin === "color"
    );
    if (hasLightProps) return "light";
    if (/\b(light|led|bulb|lamp)\b/.test(desc)) return "light";
    if (/\b(plug|outlet|socket)\b/.test(desc)) return "socket";
    if (/\b(relay)\b/.test(desc)) return "relay";
    if (/\b(switch)\b/.test(desc)) return "socket";
    return "socket";
}

function inferInputKind(prop: UHNProperty): string {
    const pin = prop.pin.toLowerCase();
    const desc = (prop.description ?? "").toLowerCase();
    if (pin === "occupancy" || /\bmotion\b/.test(desc) || /\bpresence\b/.test(desc)) return "pir";
    if (pin === "contact" || /\bdoor\b/.test(desc) || /\bwindow\b/.test(desc)) return "button";
    return "sensor";
}

function mapAnalogInputKind(pin: string, unit?: string): string {
    if (pin === "battery") return "battery";
    if (pin === "temperature" || unit === "°C") return "temperature";
    if (pin === "humidity" || unit === "%") return "humidity";
    if (pin === "power" || unit === "W") return "power";
    if (pin === "voltage" || unit === "V") return "voltage";
    if (pin === "current" || unit === "A") return "current";
    if (pin === "energy" || unit === "kWh") return "energy";
    return "sensor";
}

function mapAnalogOutputKind(pin: string): string {
    if (pin === "brightness") return "dimmer";
    if (pin === "color_temp") return "colorTemp";
    return "control";
}

function inferActionInputKind(device: ParsedDevice): string {
    const desc = (device.description ?? "").toLowerCase();
    if (/\b(remote|controller)\b/.test(desc)) return "remote";
    return "button";
}

function suggestDecimalPrecision(pin: string, unit?: string): number | undefined {
    if (unit === "W" || unit === "V" || pin === "battery") return 0;
    if (unit === "A") return 2;
    if (unit === "°C" || unit === "%") return 1;
    return undefined;
}
