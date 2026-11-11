/**
 * Builds the playable movie files from a source folder (the USB master): files the browser can play are copied with faststart,
 * everything else is converted to h264/aac mp4, split films (CD01/CD02) are merged, text subtitles become WebVTT.
 * Originals are not kept with the movies. Rerunning skips what is already done.
 *
 *   tsx src/movie/convert-movies.ts --category movies --source ~/media/Movies --dest /movies/Movies [--dry-run] [--only "Mad Max"]
 */
import { MovieCategory } from "@vid/common";
import fs from "fs";
import path from "path";
import { convertMovie } from "./movie-converter";
import { parseMovieFiles } from "./movie-name-parser";

const CATEGORIES: MovieCategory[] = ["movies", "kids", "tv"];

const argument = (name: string): string | undefined => {
    const index = process.argv.indexOf(`--${name}`);
    return index >= 0 ? process.argv[index + 1] : undefined;
};

const listFiles = (root: string, relative = ""): string[] =>
    fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) => {
        const entryPath = relative ? `${relative}/${entry.name}` : entry.name;
        return entry.isDirectory() ? listFiles(root, entryPath) : [entryPath];
    });

/** A name that is safe as a file name on every file system. */
const safeName = (name: string) => name.replace(/[/\\:*?"<>|]/g, " ").replace(/\s{2,}/g, " ").trim();

const main = async () => {
    const category = argument("category") as MovieCategory | undefined;
    const source = argument("source");
    const dest = argument("dest");
    const only = argument("only")?.toLowerCase();
    const dryRun = process.argv.includes("--dry-run");
    if (!category || !CATEGORIES.includes(category) || !source || !dest) {
        console.error(`Usage: convert-movies --category ${CATEGORIES.join("|")} --source <folder> --dest <folder> [--only <title>] [--dry-run]`);
        process.exit(1);
    }

    const parsed = parseMovieFiles(category, listFiles(source));
    for (const skipped of parsed.skipped) {
        console.log(`skip ${skipped.file}: ${skipped.reason}`);
    }

    type Job = { label: string; inputs: string[]; subtitleFiles: string[]; output: string };
    const jobs: Job[] = [
        ...parsed.movies.map((movie) => {
            const name = safeName(movie.year ? `${movie.title} (${movie.year})` : movie.title);
            return {
                label: name,
                inputs: movie.files,
                subtitleFiles: movie.subtitleFiles,
                output: path.join(dest, name, `${name}.mp4`),
            };
        }),
        ...parsed.episodes.map((episode) => {
            const season = `Season ${String(episode.season).padStart(2, "0")}`;
            const name = safeName(`${episode.series} - S${String(episode.season).padStart(2, "0")}E${String(episode.episode).padStart(2, "0")} - ${episode.title}`);
            return {
                label: name,
                inputs: [episode.file],
                subtitleFiles: [],
                output: path.join(dest, safeName(episode.series), season, `${name}.mp4`),
            };
        }),
    ].filter((job) => !only || job.label.toLowerCase().includes(only));

    let failed = 0;
    for (const [index, job] of jobs.entries()) {
        const started = Date.now();
        console.log(`[${index + 1}/${jobs.length}] ${job.label}`);
        try {
            const result = await convertMovie({
                inputs: job.inputs.map((file) => path.join(source, file)),
                output: job.output,
                subtitleFiles: job.subtitleFiles.map((file) => path.join(source, file)),
                dryRun,
                log: (message) => process.env.VERBOSE && console.log(`  ${message}`),
            });
            const seconds = Math.round((Date.now() - started) / 1000);
            console.log(`  ${result.status} (${result.mode}, ${job.inputs.length} file(s), ${seconds} s), ${result.subtitles.length} subtitle file(s)`);
            for (const note of result.skippedSubtitles) {
                console.log(`  subtitles skipped: ${note}`);
            }
        } catch (error) {
            failed++;
            console.error(`  FAILED: ${error instanceof Error ? error.message : error}`);
        }
    }
    console.log(`Done: ${jobs.length - failed} ok, ${failed} failed`);
    process.exit(failed ? 1 : 0);
};

void main();
