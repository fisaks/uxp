import { execFile } from "child_process";
import { createHash } from "crypto";
import { readdir, stat } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { VIDEO_EXTENSIONS } from "./home-video.config";

const execFileAsync = promisify(execFile);

export type ScannedClip = {
    id: string;
    /** The path relative to the home video folder, with `/` as separator. */
    file: string;
    durationSeconds: number;
    width: number;
    height: number;
    sizeBytes: number;
    mtimeMs: number;
    /** The date in the name of the folder or the file, if there is one. */
    parsedDate: string | null;
};

export const clipId = (file: string) => createHash("sha1").update(file).digest("hex").slice(0, 16);

const DATE_PATTERN = /(?<![0-9])(\d{4})[_-](\d{2})[_-](\d{2})(?![0-9])/;

/** A date like `2009_03_26` or `2009-03-26` in the name of the folder, or else of the file. Only a date that exists counts. */
export const parseDate = (file: string): string | null => {
    const parts = file.split("/");
    for (const name of [parts.length > 1 ? parts[0] : "", parts[parts.length - 1]]) {
        const match = DATE_PATTERN.exec(name);
        if (!match) {
            continue;
        }
        const [, year, month, day] = match;
        const date = new Date(Date.UTC(+year, +month - 1, +day));
        if (date.getUTCFullYear() === +year && date.getUTCMonth() === +month - 1 && date.getUTCDate() === +day) {
            return `${year}-${month}-${day}`;
        }
    }
    return null;
};

/** The part of the JSON that `ffprobe -print_format json -show_format -show_streams` prints that the scanner reads. */
type FfprobeOutput = {
    format?: { duration?: string };
    streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
};

type Probe = { durationSeconds: number; width: number; height: number };

export const probe = async (file: string): Promise<Probe> => {
    const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], {
        maxBuffer: 10 * 1024 * 1024,
    });
    const info = JSON.parse(stdout) as FfprobeOutput;
    const video = info.streams?.find((stream) => stream.codec_type === "video");
    return { durationSeconds: Number(info.format?.duration) || 0, width: video?.width ?? 0, height: video?.height ?? 0 };
};

const listVideoFiles = async (folder: string, relative = ""): Promise<string[]> => {
    const files: string[] = [];
    for (const entry of await readdir(path.join(folder, relative), { withFileTypes: true })) {
        const child = relative ? `${relative}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            files.push(...(await listVideoFiles(folder, child)));
        } else if (entry.isFile() && VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
            files.push(child);
        }
    }
    return files;
};

/** The clips in the folder. A clip that is unchanged since `previous` (same size and time) is not probed again. */
export const scanFolder = async (folder: string, previous: Map<string, ScannedClip>): Promise<ScannedClip[]> => {
    const clips: ScannedClip[] = [];
    for (const file of (await listVideoFiles(folder)).sort()) {
        const { size, mtimeMs } = await stat(path.join(folder, file));
        const known = previous.get(file);
        if (known && known.sizeBytes === size && known.mtimeMs === mtimeMs) {
            clips.push(known);
            continue;
        }
        const { durationSeconds, width, height } = await probe(path.join(folder, file));
        clips.push({ id: clipId(file), file, durationSeconds, width, height, sizeBytes: size, mtimeMs, parsedDate: parseDate(file) });
    }
    return clips;
};
