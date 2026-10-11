// clock-time.ts — Parsing of "HH:mm" clock time strings (shared by cron, electricity windows and the build validator).

/** Parses "H:mm" / "HH:mm" (24h). Throws on invalid format, hour or minute. */
export function parseClockTime(time: string): { hour: number; minute: number } {
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
        throw new Error(`Invalid time format "${time}". Expected HH:mm (e.g. "07:00", "18:30").`);
    }
    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    if (hour < 0 || hour > 23) throw new Error(`Invalid hour ${hour} in time "${time}".`);
    if (minute < 0 || minute > 59) throw new Error(`Invalid minute ${minute} in time "${time}".`);
    return { hour, minute };
}
