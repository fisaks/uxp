// schedule-fire.service.ts — Evaluates schedule timing and fires events.
//
// Runs on master only. When a schedule fires:
// 1. Publishes MQTT uhn/schedule/fired (for edge runtimes)
// 2. Sends IPC scheduleEvent to master runtime
//
// On blueprint reload: clears all timers, recalculates from new schedules.
// On blueprint stop: clears all timers.

import { ScheduleWhen, SunEvent } from "@uhn/blueprint";
import { RuntimeSchedule } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { CronExpressionParser } from "cron-parser";
import { DateTime } from "luxon";
import { formatSunTimesLog, getSunTimes, SunTimes } from "../util/sun.util";
import { blueprintScheduleService } from "./blueprint-schedule.service";
import mqttService from "./mqtt.service";
import { ruleRuntimeProcessService } from "./rule-runtime-process.service";

const LOG_TAG = "[ScheduleFireService]";
const SCHEDULE_FIRED_TOPIC = "uhn/master/schedule/fired";

type ScheduleTimer = {
    scheduleId: string;
    when: ScheduleWhen;
    timeout: NodeJS.Timeout;
    nextFireTime: DateTime;
};

type GeoLocation = {
    latitude: number;
    longitude: number;
};

class ScheduleFireService {
    private timers = new Map<string, ScheduleTimer[]>();
    private lastFiredAt = new Map<string, number>();
    private sunTimes: SunTimes | undefined;
    private sunTimesDate: string | undefined; // "YYYY-MM-DD" of last calculation
    private midnightTimer: NodeJS.Timeout | undefined;
    private location: GeoLocation | undefined;

    constructor() {
        blueprintScheduleService.on("schedulesReloaded", (schedules) => {
            this.onSchedulesReloaded(schedules);
        });
        blueprintScheduleService.on("schedulesCleared", () => {
            this.clearAllTimers();
        });
    }

    /** Configure lat/lon for sun-based schedules. Call from system config. */
    setLocation(location: GeoLocation | undefined) {
        this.location = location;
        if (location) {
            AppLogger.info({
                message: `${LOG_TAG} Location set: lat=${location.latitude}, lon=${location.longitude}`,
            });
            this.recalculateSunTimes();
        } else {
            this.sunTimes = undefined;
            this.sunTimesDate = undefined;
        }
    }

    getLocation(): GeoLocation | undefined {
        return this.location;
    }

    /** Get the next fire time for a schedule (for UI display). */
    getNextFireTime(scheduleId: string): DateTime | undefined {
        const timers = this.timers.get(scheduleId);
        if (!timers?.length) return undefined;
        return timers.reduce((earliest, t) =>
            t.nextFireTime < earliest ? t.nextFireTime : earliest,
            timers[0].nextFireTime
        );
    }

    // ---- Internal ----

    private onSchedulesReloaded(schedules: RuntimeSchedule[]) {
        this.clearAllTimers();

        const today = DateTime.now().toFormat("yyyy-MM-dd");
        if (this.sunTimesDate !== today && this.location) {
            this.recalculateSunTimes();
        }

        for (const schedule of schedules) {
            this.scheduleAllTriggers(schedule);
            this.checkMissed(schedule);
        }

        this.setupMidnightRecalculation();

        AppLogger.info({
            message: `${LOG_TAG} Scheduled ${schedules.length} schedule(s). Active timers: ${this.countTimers()}.`,
        });
    }

    /** Schedule timers for all when entries of a schedule. Only call after clearing existing timers for this schedule. */
    private scheduleAllTriggers(schedule: RuntimeSchedule) {
        const now = DateTime.now();
        const entries: ScheduleTimer[] = [];

        for (const when of schedule.when) {
            const nextFire = this.calculateNextFire(when, now);
            if (!nextFire) continue;

            const delayMs = nextFire.diff(now).as("milliseconds");
            if (delayMs <= 0) continue;

            const timeout = setTimeout(() => {
                this.onTimerFired(schedule, when);
            }, delayMs);

            entries.push({
                scheduleId: schedule.id,
                when,
                timeout,
                nextFireTime: nextFire,
            });
        }

        if (entries.length > 0) {
            this.timers.set(schedule.id, entries);
        }
    }

    private calculateNextFire(when: ScheduleWhen, now: DateTime): DateTime | undefined {
        switch (when.kind) {
            case "cron":
                return this.nextCronFire(when.expression, now);
            case "sun":
                return this.nextSunFire(when.event, when.offsetMinutes, now);
            case "date":
                return this.nextDateFire(when.month, when.day, when.time, now);
        }
    }

    private nextCronFire(expression: string, now: DateTime): DateTime | undefined {
        try {
            const parsed = CronExpressionParser.parse(expression, {
                currentDate: now.toJSDate(),
            });
            const next = parsed.next();
            return DateTime.fromJSDate(next.toDate());
        } catch (err) {
            AppLogger.error({
                message: `${LOG_TAG} Invalid cron expression "${expression}": ${err}`,
            });
            return undefined;
        }
    }

    private nextSunFire(event: SunEvent, offsetMinutes: number, now: DateTime): DateTime | undefined {
        if (!this.sunTimes) {
            AppLogger.warn({
                message: `${LOG_TAG} Sun event "${event}" requested but no location configured. Skipping.`,
            });
            return undefined;
        }

        const eventTime = this.sunTimes[event];
        if (!eventTime) return undefined;

        const fireTime = eventTime.plus({ minutes: offsetMinutes });

        // If today's time has passed, return undefined — midnight recalculation
        // will refresh sun times and reschedule for the next day.
        if (fireTime <= now) return undefined;

        return fireTime;
    }

    private nextDateFire(month: number, day: number, time: string, now: DateTime): DateTime | undefined {
        const [hourStr, minuteStr] = time.split(":");
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);

        // Try this year first
        let candidate = DateTime.fromObject({
            year: now.year,
            month,
            day,
            hour,
            minute,
        });

        // If it's in the past, try next year
        if (candidate <= now) {
            candidate = candidate.set({ year: now.year + 1 });
        }

        return candidate;
    }

    /** Publish MQTT + send IPC for a schedule fire. No timer management. */
    private fireScheduleEvent(schedule: RuntimeSchedule, when: ScheduleWhen) {
        const firedAt = DateTime.now().toISO()!;

        AppLogger.info({
            message: `${LOG_TAG} Schedule "${schedule.id}" fired (${this.describeWhen(when)}).`,
        });

        this.lastFiredAt.set(schedule.id, Date.now());

        // Publish MQTT for edge runtimes
        const payload = JSON.stringify({ scheduleId: schedule.id, firedAt });
        mqttService.publish(SCHEDULE_FIRED_TOPIC, payload, { retain: false, qos: 1 });

        // Send IPC to master runtime
        try {
            ruleRuntimeProcessService.sendEvent<"scheduleEvent">({
                cmd: "scheduleEvent",
                payload: { scheduleId: schedule.id, firedAt },
            });
        } catch (err) {
            AppLogger.error({
                message: `${LOG_TAG} Failed to send scheduleEvent IPC for "${schedule.id}": ${err}`,
            });
        }
    }

    /** Called when a timer fires. Sends the event and reschedules the next occurrence. */
    private onTimerFired(schedule: RuntimeSchedule, when: ScheduleWhen) {
        this.fireScheduleEvent(schedule, when);
        this.removeFiredTimer(schedule.id, when);
        this.scheduleNextForWhen(schedule, when);
    }

    private checkMissed(schedule: RuntimeSchedule) {
        if (schedule.missedGraceMs <= 0) return;

        const now = Date.now();
        const lastFired = this.lastFiredAt.get(schedule.id);

        for (const when of schedule.when) {
            const prevFire = this.calculatePreviousFire(when);
            if (!prevFire) continue;

            const prevFireMs = prevFire.toMillis();

            // Skip if we already fired after or at this time
            if (lastFired && lastFired >= prevFireMs) continue;

            const missedBy = now - prevFireMs;
            if (missedBy > 0 && missedBy <= schedule.missedGraceMs) {
                AppLogger.info({
                    message: `${LOG_TAG} Schedule "${schedule.id}" missed by ${Math.round(missedBy / 1000)}s (grace: ${schedule.missedGraceMs / 1000}s) — firing now.`,
                });
                this.fireScheduleEvent(schedule, when);
                return; // Fire once, not once per missed when
            }
        }
    }

    private calculatePreviousFire(when: ScheduleWhen): DateTime | undefined {
        const now = DateTime.now();

        if (when.kind === "cron") {
            try {
                const parsed = CronExpressionParser.parse(when.expression, {
                    currentDate: now.toJSDate(),
                });
                const prev = parsed.prev();
                return DateTime.fromJSDate(prev.toDate());
            } catch {
                return undefined;
            }
        }

        if (when.kind === "sun") {
            if (!this.sunTimes) return undefined;
            const eventTime = this.sunTimes[when.event];
            if (!eventTime) return undefined;
            const fireTime = eventTime.plus({ minutes: when.offsetMinutes });
            // Only return if it's in the past (i.e. it was supposed to fire today, before now)
            return fireTime < now ? fireTime : undefined;
        }

        if (when.kind === "date") {
            const [hourStr, minuteStr] = when.time.split(":");
            const hour = parseInt(hourStr, 10);
            const minute = parseInt(minuteStr, 10);
            const candidate = DateTime.fromObject({ year: now.year, month: when.month, day: when.day, hour, minute });
            if (candidate < now) return candidate;
            // On Jan 1, also check last year's date (e.g. Dec 31 missed overnight)
            if (now.month === 1 && now.day === 1) {
                const lastYear = candidate.set({ year: now.year - 1 });
                if (lastYear < now) return lastYear;
            }
            return undefined;
        }

        return undefined;
    }

    // ---- Sun time management ----

    private recalculateSunTimes() {
        if (!this.location) return;
        const now = DateTime.now();
        this.sunTimes = getSunTimes(now, this.location.latitude, this.location.longitude);
        this.sunTimesDate = now.toFormat("yyyy-MM-dd");

        AppLogger.info({
            message: `${LOG_TAG} Sun times for ${this.sunTimesDate}: ${formatSunTimesLog(this.sunTimes)}`,
        });
    }

    private setupMidnightRecalculation() {
        if (this.midnightTimer) {
            clearTimeout(this.midnightTimer);
        }

        const now = DateTime.now();
        const midnight = now.plus({ days: 1 }).startOf("day");
        const delayMs = midnight.diff(now).as("milliseconds") + 1000; // +1s buffer

        this.midnightTimer = setTimeout(() => {
            AppLogger.info({ message: `${LOG_TAG} Midnight — recalculating sun times.` });
            this.recalculateSunTimes();

            // Reschedule only sun timers — cron and date timers are unaffected
            const schedules = blueprintScheduleService.getAllSchedules();
            for (const schedule of schedules) {
                if (schedule.when.some(w => w.kind === "sun")) {
                    this.clearSunTimersForSchedule(schedule.id);
                    this.scheduleSunTriggers(schedule);
                }
            }

            this.setupMidnightRecalculation();
        }, delayMs);
    }

    // ---- Timer management ----

    /** Remove the timer entry for a specific when trigger that already fired (timeout already executed). */
    private removeFiredTimer(scheduleId: string, when: ScheduleWhen) {
        const timers = this.timers.get(scheduleId);
        if (!timers) return;
        const idx = timers.findIndex(t => t.when === when);
        if (idx !== -1) timers.splice(idx, 1);
        if (timers.length === 0) this.timers.delete(scheduleId);
    }

    /** Schedule the next occurrence for a single when trigger, appending to existing timers.
     *  For sun triggers this is effectively a no-op after firing (today's time already passed,
     *  nextSunFire returns undefined) — midnight recalculation handles the next day. */
    private scheduleNextForWhen(schedule: RuntimeSchedule, when: ScheduleWhen) {
        const now = DateTime.now();
        const nextFire = this.calculateNextFire(when, now);
        if (!nextFire) return;

        const delayMs = nextFire.diff(now).as("milliseconds");
        if (delayMs <= 0) return;

        const timeout = setTimeout(() => {
            this.onTimerFired(schedule, when);
        }, delayMs);

        const existing = this.timers.get(schedule.id) ?? [];
        existing.push({
            scheduleId: schedule.id,
            when,
            timeout,
            nextFireTime: nextFire,
        });
        this.timers.set(schedule.id, existing);
    }

    /** Clear only sun-based timers for a schedule, keeping cron/date timers intact. */
    private clearSunTimersForSchedule(scheduleId: string) {
        const timers = this.timers.get(scheduleId);
        if (!timers) return;
        const kept: ScheduleTimer[] = [];
        for (const t of timers) {
            if (t.when.kind === "sun") {
                clearTimeout(t.timeout);
            } else {
                kept.push(t);
            }
        }
        if (kept.length > 0) {
            this.timers.set(scheduleId, kept);
        } else {
            this.timers.delete(scheduleId);
        }
    }

    /** Schedule only the sun-based triggers for a schedule, appending to existing timers. */
    private scheduleSunTriggers(schedule: RuntimeSchedule) {
        const now = DateTime.now();
        const existing = this.timers.get(schedule.id) ?? [];

        for (const when of schedule.when) {
            if (when.kind !== "sun") continue;
            const nextFire = this.nextSunFire(when.event, when.offsetMinutes, now);
            if (!nextFire) continue;

            const delayMs = nextFire.diff(now).as("milliseconds");
            if (delayMs <= 0) continue;

            const timeout = setTimeout(() => {
                this.onTimerFired(schedule, when);
            }, delayMs);

            existing.push({
                scheduleId: schedule.id,
                when,
                timeout,
                nextFireTime: nextFire,
            });
        }

        if (existing.length > 0) {
            this.timers.set(schedule.id, existing);
        }
    }

    private clearAllTimers() {
        for (const timers of this.timers.values()) {
            for (const t of timers) clearTimeout(t.timeout);
        }
        this.timers.clear();
        if (this.midnightTimer) {
            clearTimeout(this.midnightTimer);
            this.midnightTimer = undefined;
        }
    }

    private countTimers(): number {
        let count = 0;
        for (const timers of this.timers.values()) count += timers.length;
        return count;
    }

    private describeWhen(when: ScheduleWhen): string {
        switch (when.kind) {
            case "cron":
                return `cron: ${when.expression}`;
            case "sun":
                return `sun: ${when.event}${when.offsetMinutes ? ` ${when.offsetMinutes > 0 ? "+" : ""}${when.offsetMinutes}min` : ""}`;
            case "date":
                return `date: ${when.month}/${when.day} ${when.time}`;
        }
    }
}

export const scheduleFireService = new ScheduleFireService();
