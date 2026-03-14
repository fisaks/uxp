import { RuntimeRuleTriggerInfo } from "@uhn/common";

export function triggerEventLabel(trigger: RuntimeRuleTriggerInfo): string {
    switch (trigger.kind) {
        case "resource":
            return trigger.event;
        case "threshold":
            return `${trigger.direction} ${trigger.threshold}`;
        case "tap":
            return "tap";
        case "longPress":
            return "longPress";
        case "timer":
            return `timer ${trigger.event}`;
    }
}
