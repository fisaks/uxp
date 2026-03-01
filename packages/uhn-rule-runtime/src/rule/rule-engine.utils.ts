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

export function getAnalogInputEventsFromStateChange(
    prev: ResourceState | undefined,
    next: ResourceState
): TriggerEvent[] {
    const events: TriggerEvent[] = [];

    if (prev?.value !== next.value) {
        events.push("changed");
    }

    return events;
}

export function getAnalogOutputEventsFromStateChange(
    prev: ResourceState | undefined,
    next: ResourceState
): TriggerEvent[] {
    const events: TriggerEvent[] = [];

    if (prev?.value !== next.value) {
        events.push("changed");
    }

    const wasActive = typeof prev?.value === "number" && prev.value > 0;
    const isActive = typeof next.value === "number" && next.value > 0;

    if (!wasActive && isActive) {
        events.push("activated");
    }
    if (wasActive && !isActive) {
        events.push("deactivated");
    }

    return events;
}

export function getTimerEventsFromStateChange(
    prev: ResourceState | undefined,
    next: ResourceState
): TriggerEvent[] {
    const events: TriggerEvent[] = [];

    if ((!prev || !prev.value) && next.value === true) {
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
        (resource as DigitalInputResourceBase).inputType === "push" &&
        (resource as DigitalInputResourceBase).inputKind === "button"
    );
}

export function isResourceTrigger(trigger: RuleTrigger): trigger is Extract<RuleTrigger, { kind: "resource" }> {
    return trigger.kind === "resource";
}

export function isThresholdTrigger(trigger: RuleTrigger): trigger is Extract<RuleTrigger, { kind: "threshold" }> {
    return trigger.kind === "threshold";
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

