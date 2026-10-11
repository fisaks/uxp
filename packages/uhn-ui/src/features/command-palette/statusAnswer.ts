import { ResourceStateValue, RuntimeResource } from "@uhn/common";
import { toDeviceKey } from "../device-availability/useViewAvailability";
import { formatAnalogValue } from "../shared/formatAnalogValue";
import { DisplayItemValueState } from "../shared/tile.types";
import { isAnalogResource, ViewWithState } from "../view/viewSelectors";

// Spoken/shown answers to "what is the status of ..." questions. Built from the same state the tiles show
// (ViewWithState: active flag, nameMap name, display values), so an answer always matches the tile.

export type StatusAnswerContext = {
    resourceById: Record<string, RuntimeResource>;
    stateByResourceId: Record<string, { value: ResourceStateValue | undefined } | undefined>;
    availabilityByKey: Record<string, { available: boolean } | undefined>;
};

const SPOKEN_UNITS: Record<string, string> = { "°C": "degrees celsius", "°F": "degrees fahrenheit", "%": "percent" };

/** "4.2 degrees celsius", "on", "off" or "unknown". */
function spokenValue(value: ResourceStateValue | undefined, unit?: string, decimalPrecision?: number): string {
    if (value == null) return "unknown";
    if (typeof value === "boolean") return value ? "on" : "off";
    const formatted = formatAnalogValue(value, decimalPrecision);
    return unit ? `${formatted} ${SPOKEN_UNITS[unit] ?? unit}` : formatted;
}

/** Names are read aloud, so "&" becomes "and". */
const spokenName = (name: string) => name.replace(/&/g, "and");

function isOffline(resource: RuntimeResource | undefined, ctx: StatusAnswerContext): boolean {
    const deviceKey = toDeviceKey(resource);
    return deviceKey != null && ctx.availabilityByKey[deviceKey]?.available === false;
}

/**
 * What a view tile shows, as a sentence. Order: offline, display values (hero, left, right), nameMap name, on/off.
 * When the question names one of the display labels ("temperature"), only that value is read.
 */
export function answerViewStatus(vws: ViewWithState, ctx: StatusAnswerContext, queryTokens: string[]): string {
    const { view, stateDisplay, resolvedName, active } = vws;
    const name = spokenName(view.name ?? view.id);

    if (view.availability && isOffline(ctx.resourceById[view.availability.fromResourceId], ctx)) {
        return `${name} is offline.`;
    }

    const values = [...stateDisplay.hero, ...stateDisplay.left, ...stateDisplay.right].filter((v) => v.value != null);
    if (values.length > 0) {
        const named = (v: DisplayItemValueState) => v.label != null && queryTokens.some((t) => v.label!.toLowerCase().includes(t));
        const asked = values.filter(named);
        const read = asked.length > 0 ? asked : values;
        const parts = read.map((v) => `${v.label ? `${v.label} ` : ""}${spokenValue(v.value, v.unit, v.decimalPrecision)}`);
        return `${name}: ${parts.join(", ")}.`;
    }

    if (resolvedName) return `${spokenName(resolvedName)}.`;
    if (view.stateFrom.length > 0) return `${name} is ${active ? "on" : "off"}.`;
    return `${name} has no status to report.`;
}

/** A location item that is a bare resource (no view): its current value. */
export function answerResourceStatus(resource: RuntimeResource, ctx: StatusAnswerContext): string {
    const name = spokenName(resource.name ?? resource.id);
    if (isOffline(resource, ctx)) return `${name} is offline.`;

    const value = ctx.stateByResourceId[resource.id]?.value;
    if (value == null) return `${name} has no value yet.`;
    if (isAnalogResource(resource)) {
        return `${name} is ${spokenValue(value, resource.unit, resource.decimalPrecision)}.`;
    }
    return `${name} is ${spokenValue(typeof value === "number" ? value !== 0 : value)}.`;
}
