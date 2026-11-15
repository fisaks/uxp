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
    channels?: number;
    /** Frames per second as a fraction, such as `25/1`. */
    r_frame_rate?: string;
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

/** The languages whose audio tracks are kept, besides the original language of the film. A track with no language is kept too, as it may be any of them. */
const KEPT_AUDIO_LANGUAGES = new Set(["eng", "swe", "fin"]);

/** Languages that have two three-letter codes (the bibliographic one is common in files), so `fre` and `fra` are the same language. */
const LANGUAGE_ALIASES: Record<string, string> = {
    fre: "fra", ger: "deu", chi: "zho", dut: "nld", cze: "ces", gre: "ell", per: "fas", rum: "ron", slo: "slk", ice: "isl",
    wel: "cym", baq: "eus", arm: "hye", geo: "kat", mac: "mkd", may: "msa", mao: "mri", bur: "mya", tib: "bod", alb: "sqi",
};
const canonicalLanguage = (code: string) => LANGUAGE_ALIASES[code] ?? code;

/** The track in the original language, else the first track. */
const originalTrack = (audio: ProbeStream[], originalLanguage?: string): ProbeStream | undefined => {
    const wanted = originalLanguage ? canonicalLanguage(originalLanguage) : undefined;
    return (wanted && audio.find((stream) => stream.tags?.language && canonicalLanguage(stream.tags.language) === wanted)) || audio[0];
};

/**
 * The audio tracks to keep, the original language first, which makes it the default: a Korean film is heard in Korean, and only the
 * subtitles change. `originalLanguage` is the three-letter code of the film's language when it is known; without it the first track of the
 * source is taken for the original, as discs list the original first. Then come the tracks in a kept language or with no language, in
 * their order. Commentary and extra mixes in other languages are dropped.
 */
const keptAudio = (info: ProbeResult, originalLanguage?: string): ProbeStream[] => {
    const audio = info.streams.filter((stream) => stream.codec_type === "audio");
    const original = originalTrack(audio, originalLanguage);
    const others = audio.filter((stream) => {
        const language = stream.tags?.language;
        return stream !== original && (!language || language === "und" || KEPT_AUDIO_LANGUAGES.has(canonicalLanguage(language)));
    });
    return original ? [original, ...others] : [];
};

/** The most channels a track keeps (7.1). More is downmixed to this. */
const MAX_AUDIO_CHANNELS = 8;

/** The `-map` and codec arguments of the kept tracks. Stereo stays stereo at 160k; surround keeps its channels (at most 7.1), 5.1 at
 * 384k and 7.1 at 512k, so a film with surround sound is not downmixed. */
const audioArgs = (info: ProbeResult, originalLanguage?: string): string[] => {
    const audio = info.streams.filter((stream) => stream.codec_type === "audio");
    return keptAudio(info, originalLanguage).flatMap((stream, out) => {
        const channels = stream.channels ?? 2;
        return [
            "-map", `0:a:${audio.indexOf(stream)}`,
            "-c:a:" + out, "aac",
            "-disposition:a:" + out, out === 0 ? "default" : "0",
            "-b:a:" + out, channels > 6 ? "512k" : channels > 2 ? "384k" : "160k",
            ...(channels > 2 ? ["-ac:" + out, String(Math.min(channels, MAX_AUDIO_CHANNELS))] : []),
        ];
    });
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
    /** The three-letter code of the language of the film (`kor`), when known. That track is kept and is the default. */
    originalLanguage?: string;
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

/**
 * Writes a subtitle file as WebVTT. The frames of a MicroDVD file count at the frame rate of the video, which the header of the file
 * (`{1}{1}23.976`) often gets wrong: this file's header said 23.976 for a 25 fps rip, so every line came 4 % late. The header is left out and
 * the frame rate of the video is used.
 */
const toWebVtt = async (input: string, output: string, format: "srt" | "microdvd", videoFps: string, log: (message: string) => void) => {
    // Old Swedish subtitle files are in Windows-1252, not UTF-8.
    const charset = isUtf8(input) ? [] : ["-sub_charenc", "CP1252"];
    if (format === "microdvd") {
        const withoutHeader = `${output}.nohdr.sub`;
        fs.writeFileSync(withoutHeader, fs.readFileSync(input).toString("latin1").replace(/^\s*\{1\}\{1\}[^\r\n]*\r?\n/, ""), "latin1");
        try {
            await writeAtomically(output, (partial) =>
                run([...charset, "-f", "microdvd", "-subfps", videoFps, "-i", withoutHeader, "-f", "webvtt", partial], log)
            );
        } finally {
            fs.rmSync(withoutHeader, { force: true });
        }
        return;
    }
    await writeAtomically(output, (partial) => run([...charset, "-i", input, "-f", "webvtt", partial], log));
};

/** Converts one film (one or several parts) to a browser-playable mp4 with faststart, and its subtitles to WebVTT. */
export const convertMovie = async (options: ConvertOptions): Promise<ConvertResult> => {
    const { inputs, output, subtitleFiles, originalLanguage, dryRun, log } = options;
    const probes = await Promise.all(inputs.map(probe));
    const mode: ConvertMode = inputs.length === 1 && isBrowserCompatible(probes[0]) ? "copy" : "transcode";
    const base = output.slice(0, output.length - path.extname(output).length);
    const skippedSubtitles: string[] = [];
    const subtitles: SubtitleOutput[] = [];

    const jobs: Array<{ vtt: string; language: string | null; make: () => Promise<void> }> = [];
    const videoFps = probes[0].streams.find((stream) => stream.codec_type === "video")?.r_frame_rate ?? "25/1";
    for (const file of subtitleFiles) {
        const format = subtitleFormat(file);
        if (!format) {
            skippedSubtitles.push(`${file}: not text (VobSub pictures)`);
            continue;
        }
        const vtt = `${base}${subtitleFiles.length > 1 ? `.${jobs.length + 1}` : ""}.vtt`;
        jobs.push({ vtt, language: null, make: () => toWebVtt(file, vtt, format, videoFps, log) });
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
                // Every track is copied, the original language first so that it is the default.
                const audio = probes[0].streams.filter((stream) => stream.codec_type === "audio");
                const first = originalTrack(audio, originalLanguage);
                const order = first ? [first, ...audio.filter((stream) => stream !== first)] : [];
                const maps = order.flatMap((stream, out) => ["-map", `0:a:${audio.indexOf(stream)}`, `-disposition:a:${out}`, out === 0 ? "default" : "0"]);
                await run(["-i", inputs[0], "-map", "0:v:0", ...maps, "-c", "copy", "-movflags", "+faststart", partial], log);
                return;
            }
            const listFile = `${partial}.txt`;
            const quote = (file: string) => `'${path.resolve(file).replace(/'/g, "'\\''")}'`;
            fs.writeFileSync(listFile, inputs.map((file) => `file ${quote(file)}`).join("\n"));
            try {
                await run(
                    [
                        "-f", "concat", "-safe", "0", "-i", listFile,
                        "-map", "0:v:0",
                        // Even sizes and 4:2:0 are what h264 players expect.
                        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p",
                        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                        ...audioArgs(probes[0], originalLanguage),
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
