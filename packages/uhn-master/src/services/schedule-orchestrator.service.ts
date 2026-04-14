// schedule-orchestrator.service.ts — Collects schedules from all sources and feeds them to the timer.
//
// Listens to blueprint schedule reloads and user schedule changes.
// Merges both sources into a unified schedule list for the timer service.
// Handles missed-grace checks on startup/reload.

import { RuntimeSchedule, StoredScheduleAction, UserScheduleInfo } from "@uhn/common";
import { AppLogger, runBackgroundTask } from "@uxp/bff-common";
import { blueprintScheduleService } from "./blueprint-schedule.service";
import { scheduleExecutionService } from "./schedule-execution.service";
import { scheduleTimerService } from "./schedule-timer.service";
import { userScheduleService } from "./user-schedule.service";
const { AppDataSource } = require("../db/typeorm.config");

const LOG_TAG = "[ScheduleOrchestratorService]";

/** Adapts a UserScheduleInfo to RuntimeSchedule for the timer service. */
function userScheduleToRuntime(us: UserScheduleInfo): RuntimeSchedule {
    return {
        id: us.scheduleId,
        name: us.name,
        when: us.when,
        missedGraceMs: us.missedGraceMs,
    };
}

/**
 * Orchestrates schedule collection and timer registration.
 * Listens to blueprint reloads, merges with user schedules from DB,
 * registers everything with the timer service, and runs missed-grace checks.
 */
class ScheduleOrchestratorService {
    private lastFiredAt = new Map<string, number>();

    constructor() {
        blueprintScheduleService.on("schedulesReloaded", (schedules) => {
            this.onBlueprintReloaded(schedules);
        });
        blueprintScheduleService.on("schedulesCleared", () => {
            scheduleTimerService.clearAllSchedules();
            scheduleExecutionService.clearAllUserActions();
        });
    }

    /** Add or update a user schedule's timers and stored actions. */
    upsertUserSchedule(info: UserScheduleInfo) {
        scheduleExecutionService.setUserActions(info.scheduleId, info.actions);
        scheduleTimerService.upsertSchedules([userScheduleToRuntime(info)]);
    }

    /** Remove a user schedule's timers and stored actions. */
    removeUserSchedule(scheduleId: string) {
        scheduleExecutionService.removeUserActions(scheduleId);
        scheduleTimerService.removeSchedules([scheduleId]);
    }

    // ---- Internal ----

    private onBlueprintReloaded(blueprintSchedules: RuntimeSchedule[]) {
        // Register blueprint schedules immediately (no DB needed)
        scheduleTimerService.resetSchedules(blueprintSchedules);

        // Check missed for blueprint schedules
        for (const schedule of blueprintSchedules) {
            this.checkMissed(schedule);
        }

        // Load user schedules from DB and register them
        runBackgroundTask(AppDataSource, async () => {
            const userSchedules = await userScheduleService.listForActiveBlueprint();
            this.registerUserSchedules(userSchedules);

            // Check missed for user schedules
            for (const us of userSchedules) {
                this.checkMissed(userScheduleToRuntime(us));
            }

            AppLogger.info({
                message: `${LOG_TAG} Loaded ${blueprintSchedules.length} blueprint + ${userSchedules.length} user schedule(s).`,
            });
        }).catch(err => {
            AppLogger.error({ message: `${LOG_TAG} Failed to load user schedules: ${err}` });
        });
    }

    private registerUserSchedules(userSchedules: UserScheduleInfo[]) {
        // Build new actions map first, then swap atomically to avoid race conditions
        const actionsMap = new Map<string, StoredScheduleAction[]>();
        const runtimeSchedules: RuntimeSchedule[] = [];

        for (const us of userSchedules) {
            actionsMap.set(us.scheduleId, us.actions);
            runtimeSchedules.push(userScheduleToRuntime(us));
        }

        scheduleExecutionService.replaceAllUserActions(actionsMap);
        scheduleTimerService.upsertSchedules(runtimeSchedules);
    }

    private checkMissed(schedule: RuntimeSchedule) {
        if (schedule.missedGraceMs <= 0) return;

        const now = Date.now();
        const lastFired = this.lastFiredAt.get(schedule.id);

        for (const when of schedule.when) {
            const prevFire = scheduleTimerService.calculatePreviousFire(when);
            if (!prevFire) continue;

            const prevFireMs = prevFire.toMillis();
            if (lastFired && lastFired >= prevFireMs) continue;

            const missedBy = now - prevFireMs;
            if (missedBy > 0 && missedBy <= schedule.missedGraceMs) {
                this.lastFiredAt.set(schedule.id, now);

                runBackgroundTask(AppDataSource, async () => {
                    AppLogger.info({
                        message: `${LOG_TAG} Schedule "${schedule.id}" missed by ${Math.round(missedBy / 1000)}s (grace: ${schedule.missedGraceMs / 1000}s) — executing.`,
                    });
                    await scheduleExecutionService.executeIfNotMuted(schedule, when);
                }).catch(err => {
                    AppLogger.error({ message: `${LOG_TAG} Error in checkMissed for "${schedule.id}": ${err}` });
                });
                return; // Fire once, not once per missed when
            }
        }
    }
}

export const scheduleOrchestratorService = new ScheduleOrchestratorService();
