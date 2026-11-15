import { MovieItem } from "@vid/common";

/** The rating with one decimal, so 7 shows as 7.0. Nothing when there is none. */
export const formatRating = (rating: number | null) => (rating === null ? undefined : rating.toFixed(1));

/** A length such as 1 h 52 min. */
export const formatRuntime = (totalSeconds: number) => {
    const minutes = Math.round(totalSeconds / 60);
    const h = Math.floor(minutes / 60);
    return h > 0 ? `${h} h ${minutes % 60} min` : `${minutes} min`;
};

const pad = (n: number | null) => String(n ?? 0).padStart(2, "0");

/** S01E02. */
export const episodeCode = (item: MovieItem) => `S${pad(item.season)}E${pad(item.episode)}`;

/** The title with its year as the tile and the page call a film, and the series with the code and the title for an episode. */
export const movieName = (item: MovieItem) =>
    item.kind === "episode" ? `${item.series} ${episodeCode(item)} ${item.title}` : item.year ? `${item.title} (${item.year})` : item.title;

export const compareMovies = (a: MovieItem, b: MovieItem) => a.title.localeCompare(b.title) || (a.year ?? 0) - (b.year ?? 0);
