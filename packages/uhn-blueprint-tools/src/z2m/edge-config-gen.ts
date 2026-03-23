import type { ParsedDevice } from "./types";

/**
 * Generates the edge config zigbee[].devices[] JSON array.
 * Writable devices get optimistic: false.
 */
export function generateEdgeConfig(devices: ParsedDevice[]): object[] {
    return devices.map(d => {
        const hasWritableDigital = d.properties.some(p =>
            p.writable && (p.uhnType === "digitalOutput")
        );
        const entry: Record<string, unknown> = { name: d.friendlyName };
        if (hasWritableDigital) entry.optimistic = false;
        return entry;
    });
}
