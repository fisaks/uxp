import path from "path";
import { MovieCategory } from "@vid/common";

const mediaRoot = process.env.VID_MEDIA_ROOT || undefined;

/** The folder of each category inside the media root. They hold the files the converter wrote. */
const FOLDER_NAMES: Record<MovieCategory, string> = { movies: "Movies", kids: "KidsMovies", tv: "TvSeries" };

export const movieConfig = {
    categories: Object.keys(FOLDER_NAMES) as MovieCategory[],
    /** The folder of the category, or undefined when there is no media root. */
    folder: (category: MovieCategory): string | undefined => (mediaRoot ? path.join(mediaRoot, FOLDER_NAMES[category]) : undefined),
    /** Edits to the items. It lives with the videos, so it is backed up and moves with them. */
    metadataFile: mediaRoot ? path.join(mediaRoot, "movie-metadata.json") : undefined,
};
