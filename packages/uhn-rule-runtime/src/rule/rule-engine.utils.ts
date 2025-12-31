import { DigitalInputResourceBase, ResourceBase, ResourceState, ResourceType, RuleTrigger, TriggerEvent } from "@uhn/blueprint";

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

export function isPushButton(
    resource: ResourceBase<ResourceType>
): resource is DigitalInputResourceBase<"button"> {
    return (
        resource.type === "digitalInput" &&
        (resource as DigitalInputResourceBase).inputType === "push"
    );
}

export function isResourceTrigger(trigger: RuleTrigger): trigger is Extract<RuleTrigger, { kind: "resource" }> {
    return trigger.kind === "resource";
}

export function isLongPressTrigger(trigger: RuleTrigger): trigger is Extract<RuleTrigger, { kind: "longPress" }> {
    return trigger.kind === "longPress";
}
export function isTapTrigger(trigger: RuleTrigger): trigger is Extract<RuleTrigger, { kind: "tap" }> {
    return trigger.kind === "tap";
}
export function isTimerTrigger(trigger: RuleTrigger): trigger is Extract<RuleTrigger, { kind: "timer" }> {
    return trigger.kind === "timer";
}

