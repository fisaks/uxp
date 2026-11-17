import { AppErrorV2 } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { execFile } from "child_process";
import { promisify } from "util";
import { ProbeResult, probe } from "../movie/movie-converter";

const execFileAsync = promisify(execFile);

const VIDEO_CODEC = "h264";
const AUDIO_CODEC = "aac";

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

/**
 * Makes an MP4 that a browser and a Chromecast can play. A clip that is h264/aac is copied (fast, no loss) with the index first, so it can
 * be played while it loads. Anything else, such as HEVC from a phone, is converted. `output` is written whole, and ends in no `.mp4`, so
 * the caller moves it into place when this is done. Returns whether the clip was converted.
 */
export const makeMp4 = async (input: string, output: string, info: ProbeResult): Promise<boolean> => {
    const copy = canCopy(info);
    const codec = copy ? ["-c", "copy"] : ["-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "160k"];
    // The first video track and every audio track. Data and subtitle tracks of phones are not played and can break the copy.
    const maps = ["-map", "0:v:0", "-map", "0:a?"];
    try {
        await execFileAsync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", input, ...maps, ...codec, "-movflags", "+faststart", "-f", "mp4", output], {
            maxBuffer: 16 * 1024 * 1024,
        });
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
