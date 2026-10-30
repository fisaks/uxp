import { HistoryPlay } from "@aud/common";

// Dates are shown the Finnish way, "ti 27.10.", and times on a 24 hour clock with a colon, "09:05", as on a clock.
const LOCALE = "fi-FI";

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** "Today", "Yesterday" or the date, such as "ti 27.10." (with the year, "ti 27.10.2025", when it is not this year), in the local time of the browser. */
export const dayLabel = (iso: string, now: Date = new Date()): string => {
    const date = new Date(iso);
    const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / ONE_DAY_MS);
    if (daysAgo === 0) return "Today";
    if (daysAgo === 1) return "Yesterday";
    return date.toLocaleDateString(LOCALE, {
        weekday: "short",
        day: "numeric",
        month: "numeric",
        ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
    });
};

/** "20:15", in the local time of the browser. */
export const timeOf = (iso: string): string => {
    const date = new Date(iso);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

/** "Today 20:15", "Yesterday 09:02" or "ti 27.10. 21:40". */
export const dayAndTime = (iso: string, now: Date = new Date()): string => `${dayLabel(iso, now)} ${timeOf(iso)}`;

/** The plays, newest first, in groups of one day. */
export const groupByDay = (plays: HistoryPlay[], now: Date = new Date()): { day: string; plays: HistoryPlay[] }[] =>
    plays.reduce<{ day: string; plays: HistoryPlay[] }[]>((groups, play) => {
        const day = dayLabel(play.playedAt, now);
        const last = groups[groups.length - 1];
        if (last?.day === day) {
            last.plays.push(play);
        } else {
            groups.push({ day, plays: [play] });
        }
        return groups;
    }, []);
