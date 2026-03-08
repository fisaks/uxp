import { createSelector } from "@reduxjs/toolkit";
import { BlueprintIcon, ResourceType, ViewActiveCondition } from "@uhn/blueprint";
import { ResourceStateDetails, ResourceStateValue, RuntimeInteractionView, RuntimeResource } from "@uhn/common";
import { RootState } from "../../app/store";

type RuntimeStateEntry = { value: ResourceStateValue | undefined; timestamp: number; details?: ResourceStateDetails };
type StateMap = Record<string, RuntimeStateEntry>;

/* ------------------------------------------------------------------ */
/* Active condition evaluation                                         */
/* ------------------------------------------------------------------ */

/** Checks a numeric value against an activeWhen condition ({above}, {below}, {equals}). */
function evaluateActiveCondition(value: ResourceStateValue | undefined, condition: ViewActiveCondition): boolean {
    if (value == null) return false;
    if (typeof value === "boolean") return value;
    if ("above" in condition) return value > condition.above;
    if ("below" in condition) return value < condition.below;
    if ("equals" in condition) return value === condition.equals;
    return false;
}

/** Determines if a resource value is "active" — uses activeWhen if provided, otherwise boolean truthiness or non-zero. */
function isResourceActive(value: ResourceStateValue | undefined, activeWhen?: ViewActiveCondition): boolean {
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
    if (stateFrom.length === 0) return false;

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
/* State display values                                                */
/* ------------------------------------------------------------------ */

export type StateDisplayValue = {
    resourceId: string;
    resourceType?: ResourceType;
    label?: string;
    unit?: string;
    style: "value" | "indicator" | "flash";
    icon?: BlueprintIcon;
    value: ResourceStateValue | undefined;
    active: boolean;
    timestamp: number;
    details?: ResourceStateDetails;
};

type ResourceMap = Record<string, RuntimeResource>;

/** Builds display values for stateDisplay items — resolves resource state, type, and active flag for each item. */
function computeStateDisplay(
    view: RuntimeInteractionView,
    stateMap: StateMap,
    resourceMap: ResourceMap,
): StateDisplayValue[] {
    if (!view.stateDisplay) return [];
    return view.stateDisplay.items.map(item => {
        const stateEntry = stateMap[item.resourceId];
        const resource = resourceMap[item.resourceId];
        const value = stateEntry?.value;
        const min = resource && "min" in resource ? (resource as any).min as number | undefined : undefined;
        const active = isResourceActive(value, min != null ? { above: min } : undefined);
        return {
            resourceId: item.resourceId,
            resourceType: resource?.type,
            label: item.label,
            unit: item.unit,
            style: item.style ?? "value",
            ...("icon" in item && { icon: item.icon }),
            value,
            active,
            timestamp: stateEntry?.timestamp ?? 0,
            details: stateEntry?.details,
        };
    });
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

const selectViewState = (state: RootState) => state.views;
const selectRuntimeStateSlice = (state: RootState) => state.runtimeState;
const selectResourceById = (state: RootState) => state.resources.byId;

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
    stateDisplayValues: StateDisplayValue[];
};

/** Combines views with their computed state for rendering.
 *  stateFrom aggregation, activeWhen evaluation — all browser-side. */
export const selectViewsWithState = createSelector(
    [selectViewState, selectRuntimeStateSlice, selectResourceById],
    (views, runtimeState, resourceById): ViewWithState[] => {
        return views.allIds.map(id => {
            const view = views.byId[id];
            const active = computeViewActive(view, runtimeState.byResourceId);
            const stateDisplayValues = computeStateDisplay(view, runtimeState.byResourceId, resourceById);
            return { view, active, stateDisplayValues };
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
