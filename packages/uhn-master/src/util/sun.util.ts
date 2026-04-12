// sun.util.ts — Thin wrapper over suncalc for schedule-relevant sun events.

import SunCalc from "suncalc";
import { SunEvent } from "@uhn/blueprint";
import { DateTime } from "luxon";

export type SunTimes = Record<SunEvent, DateTime>;

/**
 * Map from our SunEvent names to suncalc's property names.
 * suncalc returns many events; we expose the 8 most useful for home automation.
 */
const SUN_EVENT_MAP: Record<SunEvent, keyof SunCalc.GetTimesResult> = {
    dawn: "dawn",
    sunrise: "sunrise",
    goldenHourEnd: "goldenHourEnd",
    solarNoon: "solarNoon",
    goldenHour: "goldenHour",
    sunset: "sunset",
    dusk: "dusk",
    night: "night",
};

/**
 * Calculate sun times for a given date and location.
 * Returns DateTime objects in the local timezone.
 */
export function getSunTimes(date: DateTime, latitude: number, longitude: number): SunTimes {
    const jsDate = date.startOf("day").toJSDate();
    const times = SunCalc.getTimes(jsDate, latitude, longitude);

    const result = {} as SunTimes;
    for (const [event, suncalcKey] of Object.entries(SUN_EVENT_MAP)) {
        result[event as SunEvent] = DateTime.fromJSDate(times[suncalcKey] as Date);
    }
    return result;
}

/** Human-friendly labels for sun events, used in logs and UI. */
export const SUN_EVENT_LABELS: Record<SunEvent, string> = {
    dawn: "Dawn (civil twilight start)",
    sunrise: "Sunrise",
    goldenHourEnd: "Golden hour end",
    solarNoon: "Solar noon",
    goldenHour: "Golden hour start",
    sunset: "Sunset",
    dusk: "Dusk (civil twilight end)",
    night: "Night",
};

/**
 * Format all sun times for a date as a single log line.
 * Example: "dawn 05:12, sunrise 05:58, sunset 19:45, dusk 20:31, ..."
 */
export function formatSunTimesLog(times: SunTimes): string {
    return Object.entries(times)
        .map(([event, dt]) => `${event} ${(dt as DateTime).toFormat("HH:mm")}`)
        .join(", ");
}
