import { isScheduleTriggerInfo, RuntimeRuleInfo } from "@uhn/common";

/** The phases of one schedule that the selected rules react to. */
export type ScheduleTriggerGroup = {
    scheduleId: string;
    phaseIds: string[];
};

/** The schedule triggers of the given rules, grouped by schedule (in the order they first appear), each phase once.
 *  Schedule triggers have no resource, so the rule page lists them separately from the resource tiles. */
export function groupScheduleTriggers(rules: RuntimeRuleInfo[]): ScheduleTriggerGroup[] {
    const phasesBySchedule = new Map<string, string[]>();
    for (const rule of rules) {
        for (const trigger of rule.triggers.filter(isScheduleTriggerInfo)) {
            const phases = phasesBySchedule.get(trigger.scheduleId) ?? [];
            if (!phases.includes(trigger.phaseId)) phases.push(trigger.phaseId);
            phasesBySchedule.set(trigger.scheduleId, phases);
        }
    }
    return Array.from(phasesBySchedule, ([scheduleId, phaseIds]) => ({ scheduleId, phaseIds }));
}
