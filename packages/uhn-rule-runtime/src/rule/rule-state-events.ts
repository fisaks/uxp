import { ResourceState, TriggerEvent } from "@uhn/blueprint";

export function getEventsFromStateChange(
    prev: ResourceState | undefined,
    next: ResourceState
): TriggerEvent[] {
    const events: TriggerEvent[] = [];

    if (prev?.value !== next.value) {
        events.push("changed");
    }

    if (prev?.value === false && next.value === true) {
        events.push("activated");
    }

    if (prev?.value === true && next.value === false) {
        events.push("deactivated");
    }

    return events;
}
