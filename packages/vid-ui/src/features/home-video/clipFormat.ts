import { HomeVideoClip } from "@vid/common";

export const NO_DATE_LABEL = "No date";

export const formatDuration = (totalSeconds: number) => {
    const seconds = Math.round(totalSeconds);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = String(seconds % 60).padStart(2, "0");
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};

const LOCALE = "fi-FI";

/** A date such as 26.3.2009. The date is shown as it is stored, without a time zone moving it. */
export const formatDate = (isoDate: string) => {
    const [year, month, day] = isoDate.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(LOCALE, { timeZone: "UTC" });
};

export const yearOf = (clip: HomeVideoClip) => clip.date?.slice(0, 4);

/** A clip that nobody has described yet. */
export const isUnlabelled = (clip: HomeVideoClip) => !clip.title && !clip.description && clip.people.length === 0 && clip.tags.length === 0;

/** What the tile and the page call a clip: its title, else its date, else its file name. */
export const clipName = (clip: HomeVideoClip) => clip.title || (clip.date ? formatDate(clip.date) : clip.file);

/** The order of the timeline: oldest first, clips without a date last, ties by file name. */
export const compareClips = (a: HomeVideoClip, b: HomeVideoClip) => {
    if (a.date !== b.date) {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
    }
    return a.file.localeCompare(b.file);
};
