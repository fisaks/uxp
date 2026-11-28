import { MovieItem } from "@vid/common";

/** The episodes of a series, in order, and the first of them, which carries what TMDB says of the series. */
export type Series = {
    name: string;
    episodes: MovieItem[];
    /** The episodes by season number, in order. */
    seasons: { season: number; episodes: MovieItem[] }[];
};

const compareEpisodes = (a: MovieItem, b: MovieItem) =>
    (a.season ?? 0) - (b.season ?? 0) || (a.episode ?? 0) - (b.episode ?? 0) || a.title.localeCompare(b.title);

/** Groups the episodes by series, the series by name. */
export const groupSeries = (items: MovieItem[]): Series[] => {
    const byName = new Map<string, MovieItem[]>();
    items.filter((i) => i.series).forEach((i) => byName.set(i.series as string, [...(byName.get(i.series as string) ?? []), i]));
    return [...byName.entries()]
        .map(([name, all]) => {
            const episodes = [...all].sort(compareEpisodes);
            const seasons: Series["seasons"] = [];
            episodes.forEach((e) => {
                const last = seasons[seasons.length - 1];
                if (last && last.season === (e.season ?? 0)) last.episodes.push(e);
                else seasons.push({ season: e.season ?? 0, episodes: [e] });
            });
            return { name, episodes, seasons };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
};

type TrackKind = "audioTracks" | "subtitles";

/** The labels of the tracks of the episodes, the ones in most episodes first. */
const labelsByCount = (episodes: MovieItem[], kind: TrackKind): [string, number][] => {
    const counts = new Map<string, number>();
    episodes.forEach((e) => new Set(e[kind].map(({ label }) => label)).forEach((label) => counts.set(label, (counts.get(label) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

/** The audio tracks and the subtitles that exist in the episodes of a series, such as `Audio: English, Swedish · Subtitles: Swedish`. */
export const formatSeriesTracks = ({ episodes }: Series) => {
    const names = (kind: TrackKind) => labelsByCount(episodes, kind).map(([label]) => label);
    const audio = names("audioTracks");
    const subtitles = names("subtitles");
    return [audio.length > 0 && `Audio: ${audio.join(", ")}`, `Subtitles: ${subtitles.length > 0 ? subtitles.join(", ") : "none"}`]
        .filter(Boolean)
        .join(" · ");
};

/** What an episode lacks that most episodes of the series have, such as `no Swedish subtitles`. Nothing for a normal episode. */
export const missingTracks = ({ episodes }: Series, episode: MovieItem): string | undefined => {
    const lacking = (kind: TrackKind, text: (label: string) => string) =>
        labelsByCount(episodes, kind)
            .filter(([label, count]) => count > episodes.length / 2 && !episode[kind].some((t) => t.label === label))
            .map(([label]) => text(label));
    const missing = [...lacking("audioTracks", (label) => `no ${label} audio`), ...lacking("subtitles", (label) => `no ${label} subtitles`)];
    return missing.length > 0 ? missing.join(", ") : undefined;
};
