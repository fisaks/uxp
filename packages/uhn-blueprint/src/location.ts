// Location types and factory
// location.ts

import type { BlueprintIcon } from "./icon";
import type { ResourceBase, ResourceType } from "./resource";
import type { InteractionView } from "./view";

/* ------------------------------------------------------------------ */
/* Location Item                                                       */
/* ------------------------------------------------------------------ */

/** Auto-detect: views have stateFrom, resources have type */
function isViewRef(ref: unknown): ref is InteractionView {
    return typeof ref === "object" && ref !== null && "stateFrom" in ref;
}

export type LocationItem =
    | { kind: "resource"; ref: ResourceBase<ResourceType>; name?: string }
    | { kind: "view"; ref: InteractionView; name?: string };

/** Input accepted by the location() factory.
 *  Bare refs are auto-detected as resource or view.
 *  Wrap in { ref, name? } to override the display name. */
export type LocationItemInput =
    | ResourceBase<ResourceType>
    | InteractionView
    | { ref: ResourceBase<ResourceType> | InteractionView; name?: string };

/* ------------------------------------------------------------------ */
/* The Location                                                        */
/* ------------------------------------------------------------------ */
export type BlueprintLocation = {
    id?: string;
    name?: string;
    description?: string;
    icon?: BlueprintIcon;
    items: LocationItem[];
};

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */

function resolveItem(input: LocationItemInput): LocationItem {
    // Wrapped { ref, name? }
    if ("ref" in input && typeof input.ref === "object") {
        const ref = input.ref;
        const name = "name" in input && typeof input.name === "string" ? input.name : undefined;
        if (isViewRef(ref)) {
            return { kind: "view", ref, ...(name != null && { name }) };
        }
        return { kind: "resource", ref: ref as ResourceBase<ResourceType>, ...(name != null && { name }) };
    }

    // Bare ref — auto-detect
    if (isViewRef(input)) {
        return { kind: "view", ref: input };
    }
    return { kind: "resource", ref: input as ResourceBase<ResourceType> };
}

export function location(props: {
    id?: string;
    name?: string;
    description?: string;
    icon?: BlueprintIcon;
    items: LocationItemInput[];
}): BlueprintLocation {
    return {
        id: props.id,
        name: props.name,
        description: props.description,
        icon: props.icon ?? "room:generic",
        items: props.items.map(resolveItem),
    };
}
