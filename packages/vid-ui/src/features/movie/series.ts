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
