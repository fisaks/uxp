import path from "path";
import { homeVideoConfig } from "../home-video/home-video.config";
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
    /** The TMDB entry of each film and series, found by the app or picked by the user. It lives with the videos for the same reason. */
    matchFile: mediaRoot ? path.join(mediaRoot, "movie-tmdb.json") : undefined,
    /** The posters from TMDB. They can be fetched again. */
    postersDir: path.join(homeVideoConfig.cacheDir, "posters"),
    /** The TMDB read access token. Without it nothing is looked up. */
    tmdbToken: process.env.VID_TMDB_TOKEN || undefined,
};
