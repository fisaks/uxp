import { SearchIndexSettings } from "@uxp/bff-common";
import { MOVIE_SEARCH_INDEX, MovieItem, MovieSearchDoc } from "@vid/common";
import { LibrarySearch, meiliEnv } from "../search/library-search";

const SETTINGS: SearchIndexSettings = {
    primaryKey: "id",
    searchableAttributes: ["title", "series", "year", "overview"],
};

const toDoc = (item: MovieItem): MovieSearchDoc => ({
    id: item.id,
    title: item.title,
    series: item.series ?? "",
    year: item.year ? String(item.year) : "",
    overview: item.overview ?? "",
});

/** The search of the movies, which are the truth for their index. */
export const movieSearch = (items: () => MovieItem[]) =>
    new LibrarySearch({ index: MOVIE_SEARCH_INDEX, settings: SETTINGS, what: "movie items", docs: () => items().map(toDoc) }, meiliEnv());
