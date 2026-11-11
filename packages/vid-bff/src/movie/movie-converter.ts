import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const BROWSER_VIDEO_CODEC = "h264";
const BROWSER_AUDIO_CODEC = "aac";
/** Subtitle tracks inside a file that are text and can become WebVTT. Bitmap tracks (dvd_subtitle) cannot be shown by a browser or a Chromecast. */
const TEXT_SUBTITLE_CODECS = new Set(["subrip", "srt", "ass", "ssa", "mov_text", "webvtt", "text"]);

type ProbeStream = {
    index: number;
    codec_type: string;
    codec_name?: string;
    width?: number;
    height?: number;
    tags?: { language?: string };
};

export type ProbeResult = {
    streams: ProbeStream[];
    format: { format_name: string; duration?: string };
};

export const probe = async (file: string): Promise<ProbeResult> => {
    const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file], {
        maxBuffer: 16 * 1024 * 1024,
    });
    return JSON.parse(stdout) as ProbeResult;
};

/** A file the browser can play as it is: h264 video and aac audio (or no audio). Only the container may need changing. */
export const isBrowserCompatible = (info: ProbeResult): boolean => {
    const video = info.streams.find((stream) => stream.codec_type === "video");
    const audio = info.streams.filter((stream) => stream.codec_type === "audio");
    return video?.codec_name === BROWSER_VIDEO_CODEC && audio.length > 0 && audio.every((stream) => stream.codec_name === BROWSER_AUDIO_CODEC);
};

export type ConvertMode = "copy" | "transcode";

export type SubtitleOutput = {
    /** Path of the WebVTT file written. */
    file: string;
    language: string | null;
};

export type ConvertOptions = {
    /** Video files in play order. More than one is merged into one output. */
    inputs: string[];
    /** The output `.mp4`. The subtitle files are written next to it with the same base name. */
    output: string;
    /** External text subtitle files that belong to the film. */
    subtitleFiles: string[];
    dryRun: boolean;
    log: (message: string) => void;
};

export type ConvertResult = {
    status: "converted" | "exists" | "dry-run";
    mode: ConvertMode;
    subtitles: SubtitleOutput[];
    /** Subtitle files or tracks that were left out, with the reason. */
    skippedSubtitles: string[];
};

const run = async (args: string[], log: (message: string) => void) => {
    log(`ffmpeg ${args.join(" ")}`);
    await execFileAsync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", ...args], { maxBuffer: 16 * 1024 * 1024 });
};

/** Writes through a `.partial` file so a stopped run never leaves a broken file that a later run takes for finished. */
const writeAtomically = async (output: string, make: (partial: string) => Promise<void>) => {
    const partial = `${output}.partial.${path.extname(output).slice(1)}`;
    fs.rmSync(partial, { force: true });
    await make(partial);
    fs.renameSync(partial, output);
};

const isUtf8 = (file: string) => {
    try {
        new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file));
        return true;
    } catch {
        return false;
    }
};

/** A `.sub` is either MicroDVD text or VobSub (an MPEG program stream with pictures, which needs its `.idx` and cannot be shown). */
const subtitleFormat = (file: string): "srt" | "microdvd" | null => {
    const extension = path.extname(file).toLowerCase();
    if (extension === ".srt") {
        return "srt";
    }
    if (extension === ".sub") {
        const head = fs.readFileSync(file).subarray(0, 64).toString("latin1");
        return /^\s*\{\d+\}\{\d+\}/.test(head) ? "microdvd" : null;
    }
    return null;
};

const toWebVtt = async (input: string, output: string, format: "srt" | "microdvd", log: (message: string) => void) => {
    // Old Swedish subtitle files are in Windows-1252, not UTF-8.
    const charset = isUtf8(input) ? [] : ["-sub_charenc", "CP1252"];
    const demuxer = format === "microdvd" ? ["-f", "microdvd"] : [];
    await writeAtomically(output, (partial) => run([...charset, ...demuxer, "-i", input, "-f", "webvtt", partial], log));
};

/** Converts one film (one or several parts) to a browser-playable mp4 with faststart, and its subtitles to WebVTT. */
export const convertMovie = async (options: ConvertOptions): Promise<ConvertResult> => {
    const { inputs, output, subtitleFiles, dryRun, log } = options;
    const probes = await Promise.all(inputs.map(probe));
    const mode: ConvertMode = inputs.length === 1 && isBrowserCompatible(probes[0]) ? "copy" : "transcode";
    const base = output.slice(0, output.length - path.extname(output).length);
    const skippedSubtitles: string[] = [];
    const subtitles: SubtitleOutput[] = [];

    const jobs: Array<{ vtt: string; language: string | null; make: () => Promise<void> }> = [];
    for (const file of subtitleFiles) {
        const format = subtitleFormat(file);
        if (!format) {
            skippedSubtitles.push(`${file}: not text (VobSub pictures)`);
            continue;
        }
        const vtt = `${base}${subtitleFiles.length > 1 ? `.${jobs.length + 1}` : ""}.vtt`;
        jobs.push({ vtt, language: null, make: () => toWebVtt(file, vtt, format, log) });
    }
    // Text tracks inside a single file. Merged parts carry no subtitles in v1.
    if (inputs.length === 1) {
        const textTracks = probes[0].streams.filter((stream) => stream.codec_type === "subtitle" && TEXT_SUBTITLE_CODECS.has(stream.codec_name ?? ""));
        for (const stream of probes[0].streams.filter((s) => s.codec_type === "subtitle" && !TEXT_SUBTITLE_CODECS.has(s.codec_name ?? ""))) {
            skippedSubtitles.push(`${inputs[0]}: track ${stream.index} is ${stream.codec_name} (pictures)`);
        }
        for (const stream of textTracks) {
            const language = stream.tags?.language ?? null;
            const vtt = `${base}.${language ?? stream.index}.vtt`;
            jobs.push({
                vtt,
                language,
                make: () => writeAtomically(vtt, (partial) => run(["-i", inputs[0], "-map", `0:${stream.index}`, "-f", "webvtt", partial], log)),
            });
        }
    }
    for (const job of jobs) {
        subtitles.push({ file: job.vtt, language: job.language });
    }

    if (dryRun) {
        return { status: "dry-run", mode, subtitles, skippedSubtitles };
    }
    fs.mkdirSync(path.dirname(output), { recursive: true });

    let status: ConvertResult["status"] = "exists";
    if (!fs.existsSync(output)) {
        status = "converted";
        await writeAtomically(output, async (partial) => {
            if (mode === "copy") {
                await run(["-i", inputs[0], "-map", "0:v:0", "-map", "0:a", "-c", "copy", "-movflags", "+faststart", partial], log);
                return;
            }
            const listFile = `${partial}.txt`;
            const quote = (file: string) => `'${path.resolve(file).replace(/'/g, "'\\''")}'`;
            fs.writeFileSync(listFile, inputs.map((file) => `file ${quote(file)}`).join("\n"));
            try {
                await run(
                    [
                        "-f", "concat", "-safe", "0", "-i", listFile,
                        "-map", "0:v:0", "-map", "0:a:0",
                        // Even sizes and 4:2:0 are what h264 players expect.
                        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p",
                        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                        "-c:a", "aac", "-b:a", "160k", "-ac", "2",
                        "-movflags", "+faststart", partial,
                    ],
                    log
                );
            } finally {
                fs.rmSync(listFile, { force: true });
            }
        });
    }
    for (const job of jobs) {
        if (!fs.existsSync(job.vtt)) {
            await job.make();
        }
    }
    return { status, mode, subtitles, skippedSubtitles };
};
