import { RuleRuntimeScheduleEventCommand } from "@uhn/common";
import { runtimeOutput } from "../io/runtime-output";
import { RuleRuntimeDependencies } from "../types/rule-runtime.type";

/**
 * Handles an incoming scheduleEvent IPC command.
 * Resolves phaseId → BlueprintPhase, then passes to the rule engine
 * for matching against rules with onPhase() triggers.
 *
 * Source: ScheduleService (master) broadcasts via MQTT, host relays to runtime via IPC.
 */
export function handleScheduleEvent({ ruleEngine, scheduleService }: RuleRuntimeDependencies, cmd: RuleRuntimeScheduleEventCommand) {
    const { scheduleId, phaseId, firedAt } = cmd.payload;

    const phase = scheduleService.getPhase(scheduleId, phaseId);
    if (!phase) {
        runtimeOutput.log({
            component: "handleScheduleEvent",
            level: "warn",
            message: `Phase "${scheduleId}.${phaseId}" not found — ignoring event`,
        });
        return;
    }

    ruleEngine.handleScheduleTriggerEvent({ phase, firedAt });

    runtimeOutput.log({
        component: "handleScheduleEvent",
        level: "info",
        message: `Phase event "${scheduleId}.${phaseId}" dispatched to rule engine (firedAt: ${firedAt})`,
    });
}
