import { MovieItem } from "@vid/common";

/** The rating with one decimal, so 7 shows as 7.0. Nothing when there is none. */
export const formatRating = (rating: number | null) => (rating === null ? undefined : rating.toFixed(1));

/** A length such as 1 h 52 min. */
export const formatRuntime = (totalSeconds: number) => {
    const minutes = Math.round(totalSeconds / 60);
    const h = Math.floor(minutes / 60);
    return h > 0 ? `${h} h ${minutes % 60} min` : `${minutes} min`;
};

/** The title with its year, as the tile and the page call a film. */
export const movieName = (item: MovieItem) => (item.year ? `${item.title} (${item.year})` : item.title);

export const compareMovies = (a: MovieItem, b: MovieItem) => a.title.localeCompare(b.title) || (a.year ?? 0) - (b.year ?? 0);
