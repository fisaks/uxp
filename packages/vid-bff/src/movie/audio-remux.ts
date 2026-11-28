import { AppLogger } from "@uxp/bff-common";
import { execFile } from "child_process";
import { mkdir, rename, rm, stat } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { homeVideoConfig } from "../home-video/home-video.config";

const execFileAsync = promisify(execFile);

const REMUX_DIR = path.join(homeVideoConfig.cacheDir, "audio-remux");

/** The remuxes being made, by file name, so two requests for the same one wait for one ffmpeg. */
const running = new Map<string, Promise<string>>();

const exists = (file: string) =>
    stat(file).then(
        () => true,
        () => false
    );

const remux = async (source: string, track: number, target: string): Promise<string> => {
    await mkdir(REMUX_DIR, { recursive: true });
    const partial = `${target}.partial.mp4`;
    try {
        // Only the first video and the one audio track, copied as they are. A browser plays the first audio track of a file and cannot switch.
        await execFileAsync(
            "ffmpeg",
            ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", source, "-map", "0:v:0", "-map", `0:a:${track}`, "-c", "copy", "-movflags", "+faststart", partial],
            { maxBuffer: 16 * 1024 * 1024 }
        );
        await rename(partial, target);
        return target;
    } catch (error) {
        await rm(partial, { force: true });
        AppLogger.error(undefined, { message: `[Audio] Could not make the file with audio track ${track} of ${source}`, error });
        throw error;
    }
};

/**
 * The file to stream for an audio track of a video: a copy of the video with only that track, made the first time and then kept.
 * The size of the source is in the name, so a changed file makes a new copy. The old ones stay until the cache folder is emptied.
 */
export const audioTrackFile = (source: string, id: string, track: number, sourceSize: number): Promise<string> => {
    const name = `${id}.${track}.${sourceSize}.mp4`;
    const target = path.join(REMUX_DIR, name);
    const pending = running.get(name);
    if (pending) {
        return pending;
    }
    const made = exists(target)
        .then((done) => (done ? target : remux(source, track, target)))
        .finally(() => running.delete(name));
    running.set(name, made);
    return made;
};
