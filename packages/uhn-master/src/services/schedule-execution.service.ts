// schedule-execution.service.ts — Handles what happens when a schedule fires.
//
// Listens to "fired" events from ScheduleTimerService.
// Checks mute state, then routes to the correct execution path:
//   - Blueprint schedules: publishes MQTT + IPC for rule triggers
//   - User schedules: executes stored actions sequentially via CommandsResourceService

import { ScheduleWhen } from "@uhn/blueprint";
import { RuntimePhase, RuntimeSchedule, StoredScheduleAction } from "@uhn/common";
import { AppLogger, runBackgroundTask } from "@uxp/bff-common";
import { DateTime } from "luxon";
import { CommandsResourceService } from "./command-resource.service";
import { commandSceneService } from "./command-scene.service";
import mqttService from "./mqtt.service";
import { ruleRuntimeProcessService } from "./rule-runtime-process.service";
import { scheduleMuteService } from "./schedule-mute.service";
import { scheduleTimerService } from "./schedule-timer.service";
const { AppDataSource } = require("../db/typeorm.config");

const LOG_TAG = "[ScheduleExecutionService]";
const SCHEDULE_FIRED_TOPIC = "uhn/master/schedule/fired";
const ACTION_DELAY_MS = 300;

/**
 * Handles schedule fire events. Checks mute state, then executes:
 * - Blueprint schedules → MQTT publish + IPC to rule runtime
 * - User schedules → stored actions sequentially via CommandsResourceService
 */
class ScheduleExecutionService {
    /** Stored actions for user schedules (keyed by scheduleId). */
    private userScheduleActions = new Map<string, StoredScheduleAction[]>();
    private resourceCommandService = new CommandsResourceService();

    constructor() {
        scheduleTimerService.on("fired", (schedule, phase) => {
            this.onPhaseFired(schedule, phase);
        });
    }

    /** Replace all user schedule actions atomically. Avoids race conditions where
     *  a timer fires between clear and re-register. Called by the orchestrator on full reload. */
    replaceAllUserActions(actions: Map<string, StoredScheduleAction[]>) {
        this.userScheduleActions = actions;
    }

    /** Set stored actions for a single user schedule. */
    setUserActions(scheduleId: string, actions: StoredScheduleAction[]) {
        this.userScheduleActions.set(scheduleId, actions);
    }

    /** Remove stored actions for a single user schedule. */
    removeUserActions(scheduleId: string) {
        this.userScheduleActions.delete(scheduleId);
    }

    /** Clear all user schedule actions. Called on blueprint clear. */
    clearAllUserActions() {
        this.userScheduleActions = new Map();
    }

    /** Execute a schedule phase fire directly (for missed-grace catch-up). Checks mute. */
    async executeIfNotMuted(schedule: RuntimeSchedule, phase: RuntimePhase) {
        if (await scheduleMuteService.isMuted(schedule.id)) {
            AppLogger.info({ message: `${LOG_TAG} Schedule "${schedule.id}" is muted — skipping.` });
            return;
        }
        this.execute(schedule, phase);
    }

    // ---- Internal ----

    private onPhaseFired(schedule: RuntimeSchedule, phase: RuntimePhase) {
        // Mute check requires DB access — run in background task
        runBackgroundTask(AppDataSource, async () => {
            await this.executeIfNotMuted(schedule, phase);
        }).catch(err => {
            AppLogger.error({ message: `${LOG_TAG} Error handling fire for "${schedule.id}": ${err}` });
        });
    }

    private execute(schedule: RuntimeSchedule, phase: RuntimePhase) {
        AppLogger.info({
            message: `${LOG_TAG} Executing schedule "${schedule.id}" phase "${phase.id}" (${describeWhen(phase.when)}).`,
        });

        const storedActions = this.userScheduleActions.get(phase.id);
        if (storedActions) {
            this.executeStoredActions(phase.id, storedActions);
        } else {
            this.publishPhaseEvent(schedule, phase);
        }
    }

    private publishPhaseEvent(schedule: RuntimeSchedule, phase: RuntimePhase) {
        const firedAt = DateTime.now().toISO()!;
        const eventPayload = { scheduleId: schedule.id, phaseId: phase.id, firedAt };

        mqttService.publish(SCHEDULE_FIRED_TOPIC, JSON.stringify(eventPayload), { retain: false, qos: 1 });

        try {
            ruleRuntimeProcessService.sendEvent<"scheduleEvent">({
                cmd: "scheduleEvent",
                payload: eventPayload,
            });
        } catch (err) {
            AppLogger.error({
                message: `${LOG_TAG} Failed to send scheduleEvent IPC for "${schedule.id}": ${err}`,
            });
        }
    }

    private async executeStoredActions(scheduleId: string, actions: StoredScheduleAction[]) {
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            try {
                await this.executeOneAction(action);
            } catch (err) {
                AppLogger.error({
                    message: `${LOG_TAG} Action ${i + 1}/${actions.length} failed for schedule "${scheduleId}": ${err}`,
                });
            }
            if (i < actions.length - 1) {
                await new Promise(resolve => setTimeout(resolve, ACTION_DELAY_MS));
            }
        }

        AppLogger.info({
            message: `${LOG_TAG} Executed ${actions.length} action(s) for user schedule "${scheduleId}".`,
        });
    }

    private async executeOneAction(action: StoredScheduleAction) {
        switch (action.type) {
            case "setDigitalOutput":
                return this.resourceCommandService.executeResourceCommand(action.resourceId, { type: "set", value: action.value });
            case "setAnalogOutput":
                return this.resourceCommandService.executeResourceCommand(action.resourceId, { type: "setAnalog", value: action.value });
            case "emitSignal":
                return this.resourceCommandService.executeResourceCommand(action.resourceId, { type: "set", value: action.value });
            case "setActionOutput":
                return this.resourceCommandService.executeResourceCommand(action.resourceId, { type: "setActionOutput", action: action.action });
            case "activateScene":
                return commandSceneService.activateScene(action.sceneId);
        }
    }
}

function describeWhen(when: ScheduleWhen): string {
    switch (when.kind) {
        case "cron": return `cron: ${when.expression}`;
        case "sun": return `sun: ${when.event}${when.offsetMinutes ? ` ${when.offsetMinutes > 0 ? "+" : ""}${when.offsetMinutes}min` : ""}`;
        case "date": return `date: ${when.month}/${when.day} ${when.time}`;
    }
}

export const scheduleExecutionService = new ScheduleExecutionService();
