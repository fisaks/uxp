import { createSelector } from "@reduxjs/toolkit";
import { BlueprintIcon, ThemePaletteColor, ValueColorRule, ValueIconRule, ViewActiveCondition } from "@uhn/blueprint";
import { ResourceStateDetails, ResourceStateValue, RuntimeAnalogInputResource, RuntimeAnalogOutputResource, RuntimeDisplayIcon, RuntimeDisplayValue, RuntimeInteractionView, RuntimeResource } from "@uhn/common";
import { RootState } from "../../app/store";
import { DisplayItemIconState, DisplayItemValueState, DisplayItemsState, EMPTY_DISPLAY_ITEMS_STATE } from "../shared/tile.types";

type AnalogResource = RuntimeAnalogInputResource | RuntimeAnalogOutputResource;

function isAnalogResource(r: RuntimeResource): r is AnalogResource {
    return r.type === "analogInput" || r.type === "analogOutput";
}

type RuntimeStateEntry = { value: ResourceStateValue | undefined; timestamp: number; details?: ResourceStateDetails };
type StateMap = Record<string, RuntimeStateEntry>;

/* ------------------------------------------------------------------ */
/* Active condition evaluation                                         */
/* ------------------------------------------------------------------ */

/** Checks a value against an activeWhen condition ({above}, {below}, {equals}).
 *  `equals` supports both number and boolean — e.g. { equals: false } inverts a digital resource. */
function evaluateActiveCondition(value: ResourceStateValue | undefined, condition: ViewActiveCondition): boolean {
    if (value == null) return false;
    if ("equals" in condition) return value === condition.equals;
    if (typeof value === "boolean") return value;
    if ("above" in condition) return value > condition.above;
    if ("below" in condition) return value < condition.below;
    return false;
}

/** Determines if a resource value is "active" — uses activeWhen if provided, otherwise boolean truthiness or non-zero. */
export function isResourceActive(value: ResourceStateValue | undefined, activeWhen?: ViewActiveCondition): boolean {
    if (value == null) return false;
    if (activeWhen) return evaluateActiveCondition(value, activeWhen);
    if (typeof value === "boolean") return value;
    return value !== 0;
}

/* ------------------------------------------------------------------ */
/* State aggregation                                                   */
/* ------------------------------------------------------------------ */

/** Coerces a resource value to number (boolean → 0/1, undefined → 0). */
function getNumericValue(value: ResourceStateValue | undefined): number {
    if (value == null) return 0;
    if (typeof value === "boolean") return value ? 1 : 0;
    return value;
}

/** Aggregates stateFrom sources into a single active/inactive boolean for the view tile icon. */
function computeViewActive(view: RuntimeInteractionView, stateMap: StateMap): boolean {
    const { stateFrom, stateAggregation = "any", activeWhen } = view;
    // Display-only views (no stateFrom) are always active — they show live data,
    // not an on/off state, so a grey "inactive" icon would look like a dead sensor.
    if (stateFrom.length === 0) return true;

    const isNumericAggregation = stateAggregation === "sum" || stateAggregation === "average"
        || stateAggregation === "max" || stateAggregation === "min";

    if (isNumericAggregation) {
        const values = stateFrom.map(s => getNumericValue(stateMap[s.resourceId]?.value));
        let aggregated: number;
        switch (stateAggregation) {
            case "sum": aggregated = values.reduce((a, b) => a + b, 0); break;
            case "average": aggregated = values.reduce((a, b) => a + b, 0) / values.length; break;
            case "max": aggregated = Math.max(...values); break;
            case "min": aggregated = Math.min(...values); break;
        }
        return activeWhen ? evaluateActiveCondition(aggregated, activeWhen) : aggregated !== 0;
    }

    // Digital aggregation
    const activeStates = stateFrom.map(s =>
        isResourceActive(stateMap[s.resourceId]?.value, s.activeWhen)
    );

    return stateAggregation === "all"
        ? activeStates.every(Boolean)
        : activeStates.some(Boolean);
}

/* ------------------------------------------------------------------ */
/* Value/icon map evaluation                                           */
/* ------------------------------------------------------------------ */

/** Evaluates a colorMap — returns the first matching theme palette token (e.g. "success"). */
function evaluateColorMap(value: ResourceStateValue | undefined, rules: ValueColorRule[]): ThemePaletteColor | undefined {
    if (value == null) return undefined;
    for (const rule of rules) {
        if ("above" in rule && typeof value === "number" && value > rule.above) return rule.color;
        if ("below" in rule && typeof value === "number" && value < rule.below) return rule.color;
        if ("equals" in rule) {
            if (typeof rule.equals === "boolean") {
                // Boolean match: true = truthy/non-zero, false = falsy/zero
                const truthy = typeof value === "boolean" ? value : value !== 0;
                if (truthy === rule.equals) return rule.color;
            } else {
                // Exact numeric match
                if (value === rule.equals) return rule.color;
            }
        }
    }
    return undefined;
}

/** Evaluates an iconMap — returns the first matching icon override. */
function evaluateIconMap(value: ResourceStateValue | undefined, rules: ValueIconRule[]): BlueprintIcon | undefined {
    if (value == null) return undefined;
    for (const rule of rules) {
        if ("above" in rule && typeof value === "number" && value > rule.above) return rule.icon;
        if ("below" in rule && typeof value === "number" && value < rule.below) return rule.icon;
        if ("equals" in rule) {
            if (typeof rule.equals === "boolean") {
                const truthy = typeof value === "boolean" ? value : value !== 0;
                if (truthy === rule.equals) return rule.icon;
            } else {
                if (value === rule.equals) return rule.icon;
            }
        }
    }
    return undefined;
}

/* ------------------------------------------------------------------ */
/* State display computation                                           */
/* ------------------------------------------------------------------ */

type ResourceMap = Record<string, RuntimeResource>;

function computeDisplayValue(item: RuntimeDisplayValue, stateMap: StateMap, resourceMap: ResourceMap): DisplayItemValueState {
    const stateEntry = stateMap[item.resourceId];
    const resource = resourceMap[item.resourceId];
    const value = stateEntry?.value;
    const min = resource && "min" in resource ? (resource as any).min as number | undefined : undefined;
    const active = isResourceActive(value, min != null ? { above: min } : undefined);
    const analog = resource && isAnalogResource(resource) ? resource : undefined;
    return {
        resourceId: item.resourceId,
        resourceType: resource?.type,
        label: item.label,
        icon: item.icon,
        unit: item.unit ?? analog?.unit,
        decimalPrecision: analog?.decimalPrecision,
        value,
        active,
        timestamp: stateEntry?.timestamp ?? 0,
        details: stateEntry?.details,
    };
}

function computeDisplayIcon(item: RuntimeDisplayIcon, stateMap: StateMap, resourceMap: ResourceMap): DisplayItemIconState {
    const stateEntry = stateMap[item.resourceId];
    const value = stateEntry?.value;
    const active = isResourceActive(value);
    const visible = item.showWhen === "active" ? active : item.showWhen === "inactive" ? !active : true;
    const color = item.colorMap ? evaluateColorMap(value, item.colorMap) : undefined;
    const resolvedIcon = item.iconMap ? (evaluateIconMap(value, item.iconMap) ?? item.icon) : item.icon;

    // Resolve tooltip: "value" → formatted value + unit from resource
    let tooltip = item.tooltip;
    if (tooltip === "value" && value != null) {
        const resource = resourceMap[item.resourceId];
        const analog = resource && isAnalogResource(resource) ? resource : undefined;
        const unit = analog?.unit;
        const formatted = typeof value === "number" && analog?.decimalPrecision != null
            ? value.toFixed(analog.decimalPrecision)
            : String(value);
        tooltip = unit ? `${formatted} ${unit}` : formatted;
    }

    return {
        resourceId: item.resourceId,
        icon: resolvedIcon,
        tooltip,
        visible,
        color,
        value,
        active,
    };
}

/** Builds the full DisplayItemsState from runtime view config + live state. */
function computeStateDisplay(
    view: RuntimeInteractionView,
    stateMap: StateMap,
    resourceMap: ResourceMap,
): DisplayItemsState {
    if (!view.stateDisplay) return EMPTY_DISPLAY_ITEMS_STATE;
    const sd = view.stateDisplay;
    return {
        topLeft: (sd.topLeft ?? []).map(i => computeDisplayIcon(i, stateMap, resourceMap)),
        topCenter: (sd.topCenter ?? []).map(i => computeDisplayIcon(i, stateMap, resourceMap)),
        topRight: (sd.topRight ?? []).map(i => computeDisplayIcon(i, stateMap, resourceMap)),
        left: (sd.left ?? []).map(i => computeDisplayValue(i, stateMap, resourceMap)),
        right: (sd.right ?? []).map(i => computeDisplayValue(i, stateMap, resourceMap)),
        badge: (sd.badge ?? []).map(i => computeDisplayIcon(i, stateMap, resourceMap)),
        hero: (sd.hero ?? []).map(i => computeDisplayValue(i, stateMap, resourceMap)),
        heroSize: sd.heroSize,
    };
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

const selectViewState = (state: RootState) => state.views;
const selectRuntimeStateSlice = (state: RootState) => state.runtimeState;
const selectResourceById = (state: RootState) => state.resources.byId;

export const selectViewsById = createSelector(
    [selectViewState],
    (views): Record<string, RuntimeInteractionView> => views.byId
);

export const selectAllViews = createSelector(
    [selectViewState],
    (views): RuntimeInteractionView[] => views.allIds.map(id => views.byId[id])
);

export const selectViewsLoaded = createSelector(
    [selectViewState],
    (views): boolean => views.isLoaded
);

export type ViewWithState = {
    view: RuntimeInteractionView;
    active: boolean;
    stateDisplay: DisplayItemsState;
};

/** Combines views with their computed state for rendering.
 *  stateFrom aggregation, activeWhen evaluation — all browser-side. */
export const selectViewsWithState = createSelector(
    [selectViewState, selectRuntimeStateSlice, selectResourceById],
    (views, runtimeState, resourceById): ViewWithState[] => {
        return views.allIds.map(id => {
            const view = views.byId[id];
            const active = computeViewActive(view, runtimeState.byResourceId);
            const stateDisplay = computeStateDisplay(view, runtimeState.byResourceId, resourceById);
            return { view, active, stateDisplay };
        });
    }
);

/** Same as selectViewsWithState but keyed by view ID for O(1) lookups. */
export const selectViewsWithStateById = createSelector(
    [selectViewsWithState],
    (viewsWithState): Record<string, ViewWithState> => {
        const map: Record<string, ViewWithState> = {};
        for (const vws of viewsWithState) {
            map[vws.view.id] = vws;
        }
        return map;
    }
);
