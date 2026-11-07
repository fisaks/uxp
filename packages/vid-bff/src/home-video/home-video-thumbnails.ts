import { execFile } from "child_process";
import { access, mkdir, rename, rm } from "fs/promises";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const WIDTH = 320;
/** The poster frame is taken this far into the clip, to skip a black start. */
const POSITION = 0.1;
/** A frame takes well under a second. ffmpeg is stopped after this, so a stalled drive does not leave the request waiting. */
const TIMEOUT_MS = 30_000;

/** Poster frames made by ffmpeg, kept as JPEG files in a folder. A frame that is being made is shared by the requests that want it. */
export class HomeVideoThumbnails {
    private readonly making = new Map<string, Promise<string>>();

    constructor(private readonly dir: string) {}

    /** The path of the poster frame of the clip, made first if it does not exist. */
    get(id: string, videoFile: string, durationSeconds: number): Promise<string> {
        let promise = this.making.get(id);
        if (!promise) {
            promise = this.make(id, videoFile, durationSeconds).finally(() => this.making.delete(id));
            this.making.set(id, promise);
        }
        return promise;
    }

    private async make(id: string, videoFile: string, durationSeconds: number): Promise<string> {
        const target = path.join(this.dir, `${id}.jpg`);
        try {
            await access(target);
            return target;
        } catch {
            // Not made yet.
        }
        await mkdir(this.dir, { recursive: true });
        const temporary = `${target}.tmp.jpg`;
        // The video is anamorphic (the pixels are not square), so the width is scaled to the shape it is shown in.
        try {
            await execFileAsync(
                "ffmpeg",
                [
                    "-v", "error", "-y",
                    "-ss", String(Math.floor(durationSeconds * POSITION)),
                    "-i", videoFile,
                    "-frames:v", "1",
                    "-vf", `scale=iw*sar:ih,setsar=1,scale=${WIDTH}:-2`,
                    temporary,
                ],
                { timeout: TIMEOUT_MS }
            );
        } catch (error) {
            await rm(temporary, { force: true });
            throw error;
        }
        await rename(temporary, target);
        return target;
    }
}
