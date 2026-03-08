import { BlueprintIcon, ResourceType } from "@uhn/blueprint";
import { ResourceStateDetails, ResourceStateValue } from "@uhn/common";

/** A single state item to display on a tile (view or resource).
 *  Produced by view selectors (from stateDisplay config) or by resource
 *  tiles (from resource state). Consumed by TileContent and ViewStateDisplay
 *  components to render flanking values, indicators, and flash badges. */
export type TileStateItem = {
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
