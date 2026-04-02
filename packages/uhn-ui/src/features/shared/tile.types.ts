import { BlueprintIcon, ResourceType } from "@uhn/blueprint";
import type { HeroFontSize, ThemePaletteColor } from "@uhn/blueprint";
import { ResourceStateDetails, ResourceStateValue } from "@uhn/common";

/** A display value item with resolved runtime state, for `left`, `right`, or `hero` slots.
 *  Produced by view selectors from DisplayValue config + runtime state. */
export type DisplayItemValueState = {
    resourceId: string;
    resourceType?: ResourceType;
    label?: string;
    icon?: BlueprintIcon;
    unit?: string;
    decimalPrecision?: number;
    value: ResourceStateValue | undefined;
    active: boolean;
    timestamp: number;
    details?: ResourceStateDetails;
};

/** A display icon item with resolved runtime state, for `topLeft`, `topCenter`, `topRight`, or `badge` slots.
 *  Produced by view selectors from DisplayIcon config + runtime state. */
export type DisplayItemIconState = {
    resourceId: string;
    icon: BlueprintIcon;
    /** Pre-resolved tooltip text. The blueprint's `"value"` sentinel is resolved
     *  to a formatted value + unit string by the view selector. */
    tooltip?: string;
    visible: boolean;
    color?: ThemePaletteColor;
    value: ResourceStateValue | undefined;
    active: boolean;
};

/** Slot-keyed state display with resolved runtime state — all 7 slots with their appropriate item types. */
export type DisplayItemsState = {
    topLeft: DisplayItemIconState[];
    topCenter: DisplayItemIconState[];
    topRight: DisplayItemIconState[];
    left: DisplayItemValueState[];
    right: DisplayItemValueState[];
    badge: DisplayItemIconState[];
    hero: DisplayItemValueState[];
    heroSize?: HeroFontSize;
};

export const EMPTY_DISPLAY_ITEMS_STATE: DisplayItemsState = {
    topLeft: [],
    topCenter: [],
    topRight: [],
    left: [],
    right: [],
    badge: [],
    hero: [],
};
