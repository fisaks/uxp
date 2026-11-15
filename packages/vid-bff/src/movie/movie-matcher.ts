import { TmdbEntry } from "./tmdb-client";

const normalize = (text: string): string =>
    text
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/^the /, "");

/**
 * The entry that is surely the one searched for, or undefined. The title must be the same as the title or the original title of the
 * entry. A film with a year must also be within a year of the release year of the entry. Of several that fit, the first counts, as
 * TMDB lists the most relevant first. An unsure match is left to the user.
 */
export const pickMatch = (results: TmdbEntry[], title: string, year: number | null): TmdbEntry | undefined => {
    const wanted = normalize(title);
    return results.find(
        (entry) =>
            (normalize(entry.title) === wanted || normalize(entry.originalTitle) === wanted) &&
            (year === null || entry.year === null || Math.abs(entry.year - year) <= 1)
    );
};
