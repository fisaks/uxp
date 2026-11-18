import { AppErrorV2 } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { spawn } from "child_process";
import { ProbeResult, aacTrackArgs, probe } from "../movie/movie-converter";

const VIDEO_CODEC = "h264";
const AUDIO_CODEC = "aac";
/** A TV or a Chromecast shows 60 frames a second at most, so more (phone slow motion is 120 or 240) is only cost. */
const MAX_FPS = 60;
const HDR_TRANSFERS = new Set(["arib-std-b67", "smpte2084"]);
/** HDR (BT.2020, HLG or PQ) to SDR BT.709: without it the picture is grey and flat in a browser. */
const TONE_MAP = "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv";

/** The file is a video that ffprobe can read, or the upload is refused with a code the UI can show. */
export const probeUpload = async (file: string): Promise<ProbeResult> => {
    let info: ProbeResult;
    try {
        info = await probe(file);
    } catch {
        throw new AppErrorV2({ code: ErrorCodes.INVALID_FILE_TYPE, message: "The file is not a video that can be read" });
    }
    if (!info.streams.some((stream) => stream.codec_type === "video")) {
        throw new AppErrorV2({ code: ErrorCodes.INVALID_FILE_TYPE, message: "The file has no video" });
    }
    return info;
};

/** h264 video with aac audio, or no audio: a phone clip that only needs its container made right. */
const canCopy = (info: ProbeResult): boolean => {
    const video = info.streams.find((stream) => stream.codec_type === "video");
    const audio = info.streams.filter((stream) => stream.codec_type === "audio");
    return video?.codec_name === VIDEO_CODEC && audio.every((stream) => stream.codec_name === AUDIO_CODEC);
};

/** The video filters of a converted clip: frame rate cap first (fewer frames to tone map), then HDR to SDR, then even size and 8 bit. */
const videoFilter = (info: ProbeResult): string => {
    const video = info.streams.find((stream) => stream.codec_type === "video");
    const [num, den] = (video?.r_frame_rate ?? "").split("/").map(Number);
    const fps = den > 0 ? num / den : 0;
    return [
        ...(fps > MAX_FPS ? [`fps=${MAX_FPS}`] : []),
        ...(HDR_TRANSFERS.has(video?.color_transfer ?? "") ? [TONE_MAP] : []),
        "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "format=yuv420p",
    ].join(",");
};

/** Runs ffmpeg and tells how many seconds of the clip are done from its `-progress` lines. Fails when ffmpeg ends with an error. */
const runFfmpeg = (args: string[], onSeconds?: (seconds: number) => void): Promise<void> =>
    new Promise((resolve, reject) => {
        const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
        let pending = "";
        child.stdout.on("data", (data: Buffer) => {
            const lines = (pending + data.toString()).split("\n");
            pending = lines.pop() ?? "";
            for (const line of lines) {
                // out_time_us is in microseconds, it is "N/A" before the first frame.
                const match = /^out_time_us=(\d+)$/.exec(line);
                if (match) onSeconds?.(Number(match[1]) / 1_000_000);
            }
        });
        let errors = "";
        child.stderr.on("data", (data: Buffer) => (errors = (errors + data.toString()).slice(-4000)));
        child.on("error", reject);
        child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ended with ${code}: ${errors}`))));
    });

/**
 * Makes an MP4 that a browser and a Chromecast can play. A clip that is h264/aac is copied (fast, no loss) with the index first, so it can
 * be played while it loads. Anything else, such as HEVC from a phone, is converted. `output` is written whole, and ends in no `.mp4`, so
 * the caller moves it into place when this is done. `onProgress` gets 0 to 100 as ffmpeg goes on, when the length of the clip is known.
 * Returns whether the clip was converted.
 */
export const makeMp4 = async (input: string, output: string, info: ProbeResult, onProgress?: (percent: number) => void): Promise<boolean> => {
    const copy = canCopy(info);
    // Data and subtitle tracks of phones are not played and can break the copy, so only the first video track and the audio tracks come along.
    // A converted clip keeps every audio track and its channels (cameras record 4 or 5.1 channels), like a film does.
    const audio = info.streams.filter((stream) => stream.codec_type === "audio");
    const video = ["-vf", videoFilter(info), "-c:v", "libx264", "-preset", "medium", "-crf", "20"];
    const codec = copy ? ["-map", "0:v:0", "-map", "0:a?", "-c", "copy"] : ["-map", "0:v:0", ...video, ...audio.flatMap((stream, index) => aacTrackArgs(stream, index, index))];
    const duration = Number(info.format.duration);
    const args = ["-hide_banner", "-loglevel", "error", "-nostdin", "-nostats", "-progress", "pipe:1", "-y", "-i", input, ...codec, "-movflags", "+faststart", "-f", "mp4", output];
    try {
        await runFfmpeg(args, duration > 0 ? (seconds) => onProgress?.(Math.min(100, Math.floor((seconds / duration) * 100))) : undefined);
    } catch {
        throw new AppErrorV2({ code: ErrorCodes.INVALID_FILE_TYPE, message: "The video could not be converted" });
    }
    return !copy;
};

/** A real time: phones without a clock write 1970 or 1904 (the zero of QuickTime). */
const isRealTime = (time: Date) => !Number.isNaN(time.getTime()) && time.getUTCFullYear() > 1970;

/**
 * The day the clip was filmed, as YYYY-MM-DD in the local time of the server (a clip filmed at 00:30 Finnish time is the day before in
 * UTC), from the `creation_time` of the file. undefined when the file has none, or one that is zero.
 */
export const filmedDate = (info: ProbeResult): string | undefined => {
    const tags = [info.format.tags, ...info.streams.map((stream) => stream.tags)];
    for (const entry of tags) {
        const raw = entry?.creation_time;
        const time = raw ? new Date(raw) : undefined;
        if (time && isRealTime(time)) {
            const pad = (n: number) => String(n).padStart(2, "0");
            return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())}`;
        }
    }
    return undefined;
};
