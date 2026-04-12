import { RuleRuntimeScheduleEventCommand } from "@uhn/common";
import { runtimeOutput } from "../io/runtime-output";
import { RuleRuntimeDependencies } from "../types/rule-runtime.type";

/**
 * Handles an incoming scheduleEvent IPC command.
 * Resolves scheduleId → BlueprintSchedule, then passes to the rule engine
 * for matching against rules with onSchedule() triggers.
 *
 * Source: ScheduleService (master) broadcasts via MQTT, host relays to runtime via IPC.
 */
export function handleScheduleEvent({ ruleEngine, scheduleService }: RuleRuntimeDependencies, cmd: RuleRuntimeScheduleEventCommand) {
    const { scheduleId, firedAt } = cmd.payload;

    const schedule = scheduleService.getById(scheduleId);
    if (!schedule) {
        runtimeOutput.log({
            component: "handleScheduleEvent",
            level: "warn",
            message: `Schedule "${scheduleId}" not found — ignoring event`,
        });
        return;
    }

    ruleEngine.handleScheduleTriggerEvent({ schedule, firedAt });

    runtimeOutput.log({
        component: "handleScheduleEvent",
        level: "info",
        message: `Schedule event "${scheduleId}" dispatched to rule engine (firedAt: ${firedAt})`,
    });
}
