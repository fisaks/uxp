import { MovieCategory } from "@vid/common";
import path from "path";

export type ParsedMovie = {
    kind: "movie";
    category: MovieCategory;
    title: string;
    year: number | null;
    /** The video files relative to the category folder, in play order (CD01, CD02, ...). More than one means the parts are merged. */
    files: string[];
    /** Subtitle files that belong to the film, relative to the category folder. */
    subtitleFiles: string[];
};

export type ParsedEpisode = {
    kind: "episode";
    category: MovieCategory;
    series: string;
    season: number;
    episode: number;
    title: string;
    file: string;
};

export type ParseResult = {
    movies: ParsedMovie[];
    episodes: ParsedEpisode[];
    /** Video files that were left out on purpose (a sample) or that could not be placed, with the reason. */
    skipped: Array<{ file: string; reason: string }>;
};

const VIDEO_EXTENSIONS = new Set([".avi", ".mkv", ".m4v", ".mp4"]);
const SUBTITLE_EXTENSIONS = new Set([".srt", ".sub"]);

const EPISODE_PATTERN = /^(.*?)\s*-\s*S(\d+)E(\d+)\s*-\s*(.+)$/i;
const YEAR_PATTERN = /(?<![0-9])((?:19|20)\d{2})(?![0-9])/;
/** CD01, CD2, Part1, Disc 2 in a name. */
const PART_PATTERN = /[\s._-]*\b(?:cd|part|disc)[\s._-]?(\d{1,2})\b/i;
/** Where the release tags start in a scene name. The title is everything before the first of them. */
const RELEASE_TAG_PATTERN = /[\s._[(-]+(?:xvid|divx|dvdrip|bdrip|brrip|swesub|swedish|swesubbed|internal|remastered|unrated|ac3|multisubs)\b/i;

const stripExtension = (name: string) => name.slice(0, name.length - path.extname(name).length);

/** The title and year in a name of a folder or a file. */
const cleanName = (rawName: string): { title: string; year: number | null } => {
    let name = rawName.replace(/\[www\.[^\]]*\]/gi, "");
    name = name.replace(PART_PATTERN, "");
    name = name.replace(/-\d+$/, "");
    const yearMatch = YEAR_PATTERN.exec(name);
    const year = yearMatch ? Number(yearMatch[1]) : null;
    // Cut at the year first (a title never contains one here), then at the first release tag.
    if (yearMatch) {
        name = name.slice(0, yearMatch.index);
    }
    const tagMatch = RELEASE_TAG_PATTERN.exec(name);
    if (tagMatch) {
        name = name.slice(0, tagMatch.index);
    }
    // A scene name uses dots (or underscores) instead of spaces.
    if (!name.includes(" ")) {
        name = name.replace(/[._]+/g, " ");
    }
    // What is left of a bracket or a dash that opened the year or the tags.
    name = name.replace(/[\s([\]-]+$/g, "").replace(/\s{2,}/g, " ").trim();
    return { title: name, year };
};

/** The part number in the file name, or else in the name of the folder holding it (`Film.Part1/xyz.avi`). */
const partNumber = (file: string): number | null => {
    const match = PART_PATTERN.exec(stripExtension(path.basename(file))) ?? PART_PATTERN.exec(path.basename(path.dirname(file)));
    return match ? Number(match[1]) : null;
};

const isSample = (parts: string[]) => parts.some((part) => /^sample$/i.test(part) || /\bsample\b/i.test(stripExtension(part)));

/**
 * Places the files of one category folder: films (grouped when a film is split in parts) and episodes.
 * `files` are paths relative to the category folder with `/` as separator. Anything that is not a video or a subtitle
 * (.jpg, .txt, .rar, .tnj, .id3) is ignored without a mention.
 */
export const parseMovieFiles = (category: MovieCategory, files: string[]): ParseResult => {
    const result: ParseResult = { movies: [], episodes: [], skipped: [] };
    const groups = new Map<string, ParsedMovie>();
    const subtitles: string[] = [];

    for (const file of [...files].sort()) {
        const extension = path.extname(file).toLowerCase();
        if (SUBTITLE_EXTENSIONS.has(extension)) {
            subtitles.push(file);
            continue;
        }
        if (!VIDEO_EXTENSIONS.has(extension)) {
            continue;
        }
        const parts = file.split("/");
        if (isSample(parts)) {
            result.skipped.push({ file, reason: "sample" });
            continue;
        }

        const stem = stripExtension(parts[parts.length - 1]);
        const episode = EPISODE_PATTERN.exec(stem);
        if (episode) {
            result.episodes.push({
                kind: "episode",
                category,
                series: parts.length > 1 ? parts[0] : episode[1].trim(),
                season: Number(episode[2]),
                episode: Number(episode[3]),
                title: episode[4].trim(),
                file,
            });
            continue;
        }

        // The folder holding the file names the film; a loose file names itself. The year may only be in the file name.
        const fromFile = cleanName(stem);
        const fromFolder = parts.length > 1 ? cleanName(parts[parts.length - 2]) : null;
        const title = fromFolder?.title || fromFile.title;
        const year = fromFolder?.year ?? fromFile.year;
        if (!title) {
            result.skipped.push({ file, reason: "no title" });
            continue;
        }
        const key = `${title.toLowerCase()}|${year ?? ""}`;
        const group = groups.get(key);
        if (group) {
            group.files.push(file);
        } else {
            groups.set(key, { kind: "movie", category, title, year, files: [file], subtitleFiles: [] });
        }
    }

    for (const movie of groups.values()) {
        movie.files.sort((a, b) => (partNumber(a) ?? 0) - (partNumber(b) ?? 0) || a.localeCompare(b));
        if (movie.files.length > 1 && movie.files.some((file) => partNumber(file) === null)) {
            // Several files with no part number: do not guess an order, list them apart.
            for (const file of movie.files) {
                result.skipped.push({ file, reason: "several files, no part numbers" });
            }
            continue;
        }
        const folders = new Set(movie.files.map((file) => path.dirname(file)));
        movie.subtitleFiles = subtitles.filter((file) => folders.has(path.dirname(file)));
        result.movies.push(movie);
    }
    result.movies.sort((a, b) => a.title.localeCompare(b.title));
    result.episodes.sort((a, b) => a.series.localeCompare(b.series) || a.season - b.season || a.episode - b.episode);
    return result;
};
