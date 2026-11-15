import { MovieCategory } from "@vid/common";
import { KIDS_PATH, MOVIES_PATH, TV_PATH } from "../../menu";

/** The categories that have a list page of their own, and where it is. */
export type MovieSectionCategory = Exclude<MovieCategory, "tv">;

export const MOVIE_SECTION_PATHS: Record<MovieSectionCategory, string> = { movies: MOVIES_PATH, kids: KIDS_PATH };

export const moviePath = (category: MovieSectionCategory, id: string) => `${MOVIE_SECTION_PATHS[category]}/items/${id}`;

export const seriesPath = (series: string) => `${TV_PATH}/series/${encodeURIComponent(series)}`;
