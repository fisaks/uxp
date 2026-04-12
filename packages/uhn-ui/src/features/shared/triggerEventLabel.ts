import { RuntimeRuleTriggerInfo } from "@uhn/common";

/** Returns a human-readable label for a rule trigger, shown in the
 *  technical rules view (rule detail panel) alongside the resource name. */
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
        case "action":
            return `action "${trigger.action}"`;
        case "schedule":
            return `schedule "${trigger.scheduleId}"`;
    }
}
