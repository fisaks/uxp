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
 * What a view tile shows, as a sentence. Order: offline, the display value the question names, then either the
 * on/off state (views with `stateFrom`, where display values such as an auto-off timer are secondary) or all
 * display values (display-only views such as sensors). A nameMap name stands in for on/off.
 */
export function answerViewStatus(vws: ViewWithState, ctx: StatusAnswerContext, queryTokens: string[]): string {
    const { view, stateDisplay, resolvedName, active } = vws;
    const name = spokenName(view.name ?? view.id);

    if (view.availability && isOffline(ctx.resourceById[view.availability.fromResourceId], ctx)) {
        return `${name} is offline.`;
    }

    const values = [...stateDisplay.hero, ...stateDisplay.left, ...stateDisplay.right].filter((v) => v.value != null);
    const readValues = (read: DisplayItemValueState[]) => {
        const parts = read.map((v) => `${v.label ? `${v.label} ` : ""}${spokenValue(v.value, v.unit, v.decimalPrecision)}`);
        return `${name}: ${parts.join(", ")}.`;
    };

    // The question names a display label ("temperature", "timer"): read just that value.
    const named = (v: DisplayItemValueState) => v.label != null && v.label.toLowerCase().split(/\W+/).some((word) => queryTokens.includes(word));
    const asked = values.filter(named);
    if (asked.length > 0) return readValues(asked);

    if (view.stateFrom.length > 0) {
        return resolvedName ? `${spokenName(resolvedName)}.` : `${name} is ${active ? "on" : "off"}.`;
    }
    if (values.length > 0) return readValues(values);
    return resolvedName ? `${spokenName(resolvedName)}.` : `${name} has no status to report.`;
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
