import { MOVIE_ID_PREFIX, MovieCategory } from "@vid/common";
import { createHash } from "crypto";
import { readdir, stat } from "fs/promises";
import path from "path";
import { VIDEO_EXTENSIONS } from "../home-video/home-video.config";
import { probe } from "../home-video/home-video-scanner";
import { ParsedEpisode, ParsedMovie, parseMovieFiles } from "./movie-name-parser";

export type ScannedItem = {
    id: string;
    category: MovieCategory;
    kind: "movie" | "episode";
    title: string;
    year: number | null;
    series: string | null;
    season: number | null;
    episode: number | null;
    /** The path relative to the folder of the category, with `/` as separator. */
    file: string;
    /** Subtitle files next to the video, relative to the folder of the category, in the order the API numbers them. */
    subtitleFiles: string[];
    durationSeconds: number;
    width: number;
    height: number;
    sizeBytes: number;
    mtimeMs: number;
};

/** The probe results of an item, which are kept while the file is unchanged. */
type Cached = Pick<ScannedItem, "durationSeconds" | "width" | "height" | "sizeBytes" | "mtimeMs">;
export type ScanCache = Map<string, Cached>;

/** The id starts with the movie prefix, so the kind of video is known from the id. */
export const itemId = (category: MovieCategory, file: string) =>
    `${MOVIE_ID_PREFIX}${createHash("sha1").update(`${category}/${file}`).digest("hex").slice(0, 16)}`;

const listFiles = async (folder: string, relative = ""): Promise<string[]> => {
    const files: string[] = [];
    for (const entry of await readdir(path.join(folder, relative), { withFileTypes: true })) {
        const child = relative ? `${relative}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            files.push(...(await listFiles(folder, child)));
        } else if (entry.isFile()) {
            files.push(child);
        }
    }
    return files;
};

/** The subtitle files of a video: the files of its folder that start with its name and end in `.vtt`. */
const subtitlesOf = (file: string, files: string[]): string[] => {
    const stem = file.slice(0, file.length - path.extname(file).length);
    return files.filter((other) => other.startsWith(`${stem}.`) && other.toLowerCase().endsWith(".vtt")).sort();
};

/** The items in the folder of a category. An item whose file is unchanged since `previous` (same size and time) is not probed again. */
export const scanCategory = async (category: MovieCategory, folder: string, previous: ScanCache): Promise<ScannedItem[]> => {
    const files = await listFiles(folder);
    const parsed = parseMovieFiles(
        category,
        files.filter((file) => VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase()))
    );
    const found: Array<ParsedMovie | ParsedEpisode> = [...parsed.movies, ...parsed.episodes];
    const items: ScannedItem[] = [];
    for (const entry of found) {
        // The converter writes one file per film, so a film with several files is not in the movies yet.
        const file = entry.kind === "movie" ? entry.files[0] : entry.file;
        if (entry.kind === "movie" && entry.files.length > 1) {
            continue;
        }
        const { size, mtimeMs } = await stat(path.join(folder, file));
        const known = previous.get(`${category}/${file}`);
        const cached: Cached =
            known && known.sizeBytes === size && known.mtimeMs === mtimeMs
                ? known
                : { ...(await probe(path.join(folder, file))), sizeBytes: size, mtimeMs };
        items.push({
            id: itemId(category, file),
            category,
            kind: entry.kind,
            title: entry.title,
            year: entry.kind === "movie" ? entry.year : null,
            series: entry.kind === "episode" ? entry.series : null,
            season: entry.kind === "episode" ? entry.season : null,
            episode: entry.kind === "episode" ? entry.episode : null,
            file,
            subtitleFiles: subtitlesOf(file, files),
            ...cached,
        });
    }
    return items;
};
