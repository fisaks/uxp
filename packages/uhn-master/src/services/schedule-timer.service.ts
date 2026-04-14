// schedule-timer.service.ts — Pure timing engine for schedules.
//
// Manages setTimeout timers for schedules. Calculates next fire times from
// cron expressions, sun events, and date triggers. Emits "fired" events.
// No DB access, no MQTT, no action execution — just timing.

import { ScheduleWhen, SunEvent } from "@uhn/blueprint";
import { RuntimeSchedule } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { CronExpressionParser } from "cron-parser";
import { DateTime } from "luxon";
import { EventEmitter } from "events";
import { formatSunTimesLog, getSunTimes, SunTimes } from "../util/sun.util";

const LOG_TAG = "[ScheduleTimerService]";

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

export type ScheduleTimerEventMap = {
    /** Emitted when a scheduled timer fires. */
    fired: [schedule: RuntimeSchedule, when: ScheduleWhen];
};

/**
 * Pure timing engine for schedules. Given schedules via `register()`,
 * manages setTimeout timers and emits "fired" events when they trigger.
 * Handles cron, sun, and date expressions. Recalculates sun times at midnight.
 */
export class ScheduleTimerService extends EventEmitter<ScheduleTimerEventMap> {
    private timers = new Map<string, ScheduleTimer[]>();
    private sunTimes: SunTimes | undefined;
    private sunTimesDate: string | undefined;
    private midnightTimer: NodeJS.Timeout | undefined;
    private location: GeoLocation | undefined;
    /** All registered schedules, needed for midnight sun recalculation. */
    private registeredSchedules: RuntimeSchedule[] = [];

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

    /** Clear all existing timers and register these schedules as the base set. */
    resetSchedules(schedules: RuntimeSchedule[]) {
        this.clearAllTimers();
        this.registeredSchedules = schedules;

        const today = DateTime.now().toFormat("yyyy-MM-dd");
        if (this.sunTimesDate !== today && this.location) {
            this.recalculateSunTimes();
        }

        for (const schedule of schedules) {
            this.scheduleAllTriggers(schedule);
        }

        this.setupMidnightRecalculation();

        AppLogger.info({
            message: `${LOG_TAG} Registered ${schedules.length} schedule(s). Active timers: ${this.countTimers()}.`,
        });
    }

    /** Add or update schedules. Clears existing timers for these IDs, creates new ones. Other timers untouched. */
    upsertSchedules(schedules: RuntimeSchedule[]) {
        for (const schedule of schedules) {
            this.clearTimersForSchedule(schedule.id);
            this.scheduleAllTriggers(schedule);
        }

        // Update registered list: remove old versions, add new
        const updatedIds = new Set(schedules.map(s => s.id));
        this.registeredSchedules = [
            ...this.registeredSchedules.filter(s => !updatedIds.has(s.id)),
            ...schedules,
        ];
    }

    /** Remove schedules by ID and clear their timers. */
    removeSchedules(scheduleIds: string[]) {
        for (const id of scheduleIds) {
            this.clearTimersForSchedule(id);
        }
        const removeSet = new Set(scheduleIds);
        this.registeredSchedules = this.registeredSchedules.filter(s => !removeSet.has(s.id));
    }

    /** Clear all timers and registered schedules. */
    clearAllSchedules() {
        this.clearAllTimers();
        this.registeredSchedules = [];
    }

    /** Calculate previous fire time for a when entry. Used by orchestrator for missed-grace checks. */
    calculatePreviousFire(when: ScheduleWhen): DateTime | undefined {
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
            return fireTime < now ? fireTime : undefined;
        }

        if (when.kind === "date") {
            const [hourStr, minuteStr] = when.time.split(":");
            const hour = parseInt(hourStr, 10);
            const minute = parseInt(minuteStr, 10);
            const candidate = DateTime.fromObject({ year: now.year, month: when.month, day: when.day, hour, minute });
            if (candidate < now) return candidate;
            if (now.month === 1 && now.day === 1) {
                const lastYear = candidate.set({ year: now.year - 1 });
                if (lastYear < now) return lastYear;
            }
            return undefined;
        }

        return undefined;
    }

    // ---- Internal timing ----

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

            entries.push({ scheduleId: schedule.id, when, timeout, nextFireTime: nextFire });
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
            const parsed = CronExpressionParser.parse(expression, { currentDate: now.toJSDate() });
            const next = parsed.next();
            return DateTime.fromJSDate(next.toDate());
        } catch (err) {
            AppLogger.error({ message: `${LOG_TAG} Invalid cron expression "${expression}": ${err}` });
            return undefined;
        }
    }

    private nextSunFire(event: SunEvent, offsetMinutes: number, now: DateTime): DateTime | undefined {
        if (!this.sunTimes) {
            AppLogger.warn({ message: `${LOG_TAG} Sun event "${event}" requested but no location configured. Skipping.` });
            return undefined;
        }
        const eventTime = this.sunTimes[event];
        if (!eventTime) return undefined;
        const fireTime = eventTime.plus({ minutes: offsetMinutes });
        if (fireTime <= now) return undefined;
        return fireTime;
    }

    private nextDateFire(month: number, day: number, time: string, now: DateTime): DateTime | undefined {
        const [hourStr, minuteStr] = time.split(":");
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);
        let candidate = DateTime.fromObject({ year: now.year, month, day, hour, minute });
        if (candidate <= now) {
            candidate = candidate.set({ year: now.year + 1 });
        }
        return candidate;
    }

    private onTimerFired(schedule: RuntimeSchedule, when: ScheduleWhen) {
        this.removeFiredTimer(schedule.id, when);
        this.scheduleNextForWhen(schedule, when);
        this.emit("fired", schedule, when);
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
        existing.push({ scheduleId: schedule.id, when, timeout, nextFireTime: nextFire });
        this.timers.set(schedule.id, existing);
    }

    // ---- Sun time management ----

    private recalculateSunTimes() {
        if (!this.location) return;
        const now = DateTime.now();
        this.sunTimes = getSunTimes(now, this.location.latitude, this.location.longitude);
        this.sunTimesDate = now.toFormat("yyyy-MM-dd");
        AppLogger.info({ message: `${LOG_TAG} Sun times for ${this.sunTimesDate}: ${formatSunTimesLog(this.sunTimes)}` });
    }

    private setupMidnightRecalculation() {
        if (this.midnightTimer) clearTimeout(this.midnightTimer);

        // Schedule for the day after the last sun calculation, not relative to now.
        // This prevents skipping a day if the system starts just before midnight.
        const baseDate = this.sunTimesDate
            ? DateTime.fromISO(this.sunTimesDate).plus({ days: 1 }).startOf("day")
            : DateTime.now().plus({ days: 1 }).startOf("day");
        const now = DateTime.now();
        const delayMs = Math.max(baseDate.diff(now).as("milliseconds") + 1000, 1000);

        this.midnightTimer = setTimeout(() => {
            AppLogger.info({ message: `${LOG_TAG} Midnight — recalculating sun times.` });
            this.recalculateSunTimes();

            for (const schedule of this.registeredSchedules) {
                if (schedule.when.some(w => w.kind === "sun")) {
                    this.clearSunTimersForSchedule(schedule.id);
                    this.scheduleSunTriggers(schedule);
                }
            }

            this.setupMidnightRecalculation();
        }, delayMs);
    }

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

            existing.push({ scheduleId: schedule.id, when, timeout, nextFireTime: nextFire });
        }

        if (existing.length > 0) {
            this.timers.set(schedule.id, existing);
        }
    }

    // ---- Timer management ----

    private removeFiredTimer(scheduleId: string, when: ScheduleWhen) {
        const timers = this.timers.get(scheduleId);
        if (!timers) return;
        const idx = timers.findIndex(t => t.when === when);
        if (idx !== -1) timers.splice(idx, 1);
        if (timers.length === 0) this.timers.delete(scheduleId);
    }

    private clearTimersForSchedule(scheduleId: string) {
        const timers = this.timers.get(scheduleId);
        if (timers) {
            for (const t of timers) clearTimeout(t.timeout);
            this.timers.delete(scheduleId);
        }
    }

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
}

export const scheduleTimerService = new ScheduleTimerService();
