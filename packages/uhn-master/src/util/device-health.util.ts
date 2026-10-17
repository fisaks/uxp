import { formatShortDateTime, RuntimeAnalogInputResource, RuntimeResource, UhnHealthId, UhnHealthItem } from "@uhn/common";

/** Why a device is watched for health alerts: an infrastructure adapter (IHC controller, Z2M bridge), or a battery
 *  device (it should always be online; a mains-powered device is offline whenever its mains is switched off). */
export type MonitoredDeviceKind = "adapter" | "battery";

const isAnalogInput = (r: RuntimeResource): r is RuntimeAnalogInputResource => r.type === "analogInput";

/** True if the blueprint has a battery resource on the device. */
export function isBatteryDevice(resources: readonly RuntimeResource[], edge: string, device: string): boolean {
    return resources.some((r) => isAnalogInput(r) && r.analogInputKind === "battery" && r.edge === edge && r.device === device);
}

export function deviceHealthId(edge: string, device: string): UhnHealthId {
    return `uhn:edge:${edge}:device:${device}`;
}

/** The health item for a device: only an offline watched device has one, otherwise undefined. The message tells since
 *  when it is offline; a battery device's message links to the device's resources on the resource page. */
export function deviceHealthItem(edge: string, device: string, available: boolean, kind: MonitoredDeviceKind | undefined, since: number): UhnHealthItem | undefined {
    if (!kind || available) return undefined;
    return {
        id: deviceHealthId(edge, device),
        message: `${device} on edge '${edge}' is offline since ${formatShortDateTime(since)}${kind === "battery" ? " (battery device)" : ""}`,
        severity: "error",
        action: { label: "Open System Panel", target: { type: "hash", identifier: "system-panel", subPath: "uhn" } },
        ...(kind === "battery" && {
            link: { type: "route", identifier: "unified-home-network", subPath: `/technical/resources?search=${encodeURIComponent(device)}` },
        }),
    };
}
