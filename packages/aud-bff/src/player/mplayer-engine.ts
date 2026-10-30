import { AppLogger } from "@uxp/bff-common";
import { Buffer } from "buffer";
import { ChildProcess, spawn } from "child_process";
import { PlayOptions, PlayerEngine, PlayerEngineListener } from "./player-engine";

const POSITION_POLL_MS = 500;
// A file that has not answered with a position for this long is not playing: mplayer prints nothing for some broken
// files, and a Raspberry Pi can take several seconds to start mplayer and open the first file.
const STALL_MS = 8000;
// The last lines mplayer printed, kept to be logged when a file stalls.
const RECENT_LINES = 15;

export type MplayerConfig = {
    /** The mplayer program, "mplayer" by default. */
    command: string;
    /** The audio output of mplayer, the value of its -ao option, for example "alsa:device=hw=0.0". mplayer chooses when not set. */
    audioOutput?: string;
};

/** A file name as one quoted argument of an mplayer command. */
const quote = (file: string) => `"${file.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/**
 * Plays with mplayer in slave mode (https://www.mplayerhq.hu/DOCS/tech/slave.txt), for machines that have mplayer but a
 * system too old for a current mpv. mplayer is started on the first file and kept running. Commands go to its input,
 * one per line. It has no events, so the end of a file is read from the "EOF code" line it prints (which needs
 * `-msglevel global=6`) and the position is asked for twice a second while playing.
 */
export class MplayerPlayerEngine implements PlayerEngine {
    private listener?: PlayerEngineListener;
    private process?: ChildProcess;
    private starting?: Promise<ChildProcess>;
    private poll?: NodeJS.Timeout;
    private paused = false;
    private playing = false;
    private lastPositionAt = 0;
    /** From loadfile until "Starting playback": a position that arrives in between is of the file before. */
    private awaitingStart = false;
    private recentLines: string[] = [];
    /** Whether the running mplayer was started to seek exactly: it is started again when the next file wants the other kind. */
    private accurateSeek = true;
    /** Where to go once "Starting playback" is printed: the start of a file that does not start at its beginning. */
    private pendingStartSec = 0;

    constructor(private readonly config: MplayerConfig) {}

    setListener(listener: PlayerEngineListener) {
        this.listener = listener;
    }

    async play(file: string, { startSec, accurateSeek }: PlayOptions) {
        if (file.includes("\n")) {
            throw new Error(`mplayer cannot play a file with a line break in its name: ${file}`);
        }
        if (this.process && this.accurateSeek !== accurateSeek) {
            await this.stopProcess();
        }
        this.accurateSeek = accurateSeek;
        await this.ensureRunning();
        this.pendingStartSec = startSec;
        this.send(`loadfile ${quote(file)} 0`);
        this.awaitingStart = true;
        // A file that is loaded while paused plays at once.
        this.paused = false;
        this.playing = true;
        this.startPolling();
    }

    pause() {
        if (this.playing && !this.paused) {
            this.send("pause");
            this.paused = true;
            this.stopPolling();
        }
    }

    resume() {
        if (this.playing && this.paused) {
            this.send("pause");
            this.paused = false;
            this.startPolling();
        }
    }

    stop() {
        this.send("stop");
        this.playing = false;
        this.paused = false;
        this.stopPolling();
    }

    seek(positionSec: number) {
        // "pausing_keep_force" keeps the pause: a command sent while paused would otherwise start playing again.
        this.send(`pausing_keep_force seek ${positionSec} 2`);
    }

    /** Ends mplayer and waits until it has, so that the next one finds the sound device free. */
    private async stopProcess() {
        const child = this.process;
        if (!child) {
            return;
        }
        this.playing = false;
        this.paused = false;
        this.stopPolling();
        this.process = undefined;
        this.starting = undefined;
        const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
        child.kill();
        await exited;
    }

    private send(command: string) {
        this.process?.stdin?.write(`${command}\n`);
    }

    private startPolling() {
        this.stopPolling();
        this.lastPositionAt = Date.now();
        this.poll = setInterval(() => this.checkPosition(), POSITION_POLL_MS);
    }

    /** Asks for the position, or gives up on the file when it has not answered for a while. */
    private checkPosition() {
        if (Date.now() - this.lastPositionAt > STALL_MS) {
            this.fail("mplayer does not play the file, it may be broken", true);
        } else {
            this.send("get_time_pos");
        }
    }

    /**
     * The file does not play. When mplayer printed nothing for it (`restart`), mplayer is killed and the next file starts
     * a new one: once it did not recover from a file that stalled (all later files stalled too until the service was
     * restarted), and a new process is cheap. When mplayer said that it could not open the file, it is fine and is kept.
     */
    private fail(message: string, restart: boolean) {
        if (!this.playing) {
            return;
        }
        AppLogger.warn(undefined, { message: `${message}. The last output of mplayer: ${this.recentLines.join(" | ") || "none"}` });
        if (restart) {
            this.playing = false;
            this.paused = false;
            this.stopPolling();
            this.process?.kill("SIGKILL");
        } else {
            this.stop();
        }
        this.listener?.onError(message);
    }

    private stopPolling() {
        clearInterval(this.poll);
        this.poll = undefined;
    }

    private ensureRunning(): Promise<ChildProcess> {
        this.starting ??= this.start().catch((error) => {
            this.starting = undefined;
            throw error;
        });
        return this.starting;
    }

    private async start(): Promise<ChildProcess> {
        const args = [
            "-slave",
            "-idle",
            "-quiet",
            "-nolirc",
            "-noconsolecontrols",
            "-vo",
            "null",
            "-msglevel",
            "global=6",
            // mp3 files that have no table of contents (a variable bitrate without a Xing header) cannot be seeked
            // to the right place by guessing from the bitrate: mplayer lands somewhere else and counts from the wanted time.
            // It reads the file up to the place, which is why long audiobooks, that are constant bitrate, are played without it.
            ...(this.accurateSeek ? ["-hr-mp3-seek"] : []),
            ...(this.config.audioOutput ? ["-ao", this.config.audioOutput] : []),
        ];
        const child = spawn(this.config.command, args, { stdio: ["pipe", "pipe", "pipe"] });
        await new Promise<void>((resolve, reject) => {
            child.once("spawn", resolve);
            child.once("error", (error: NodeJS.ErrnoException) =>
                reject(
                    new Error(error.code === "ENOENT" ? `${this.config.command} is not installed (or set AUD_PLAYER=fake)` : error.message)
                )
            );
        });
        this.process = child;
        child.stdin.on("error", () => undefined);
        [child.stdout, child.stderr].forEach((stream) => this.readLines(stream));
        child.once("exit", () => this.onExit(child));
        // mplayer does not stop by itself when the server does, so a restart of the server would leave it running.
        process.once("exit", () => child.kill());
        return child;
    }

    private readLines(stream: NodeJS.ReadableStream) {
        let rest = "";
        stream.on("data", (data: Buffer) => {
            const lines = (rest + data.toString()).split(/\r\n|\r|\n/);
            rest = lines.pop() ?? "";
            lines.forEach((line) => this.handle(line));
        });
    }

    private handle(line: string) {
        if (!line.startsWith("ANS_TIME_POSITION=") && line.trim() !== "") {
            this.recentLines = [...this.recentLines.slice(-(RECENT_LINES - 1)), line.slice(0, 120)];
        }
        const position = /^ANS_TIME_POSITION=([\d.]+)/.exec(line)?.[1];
        if (line.startsWith("Starting playback")) {
            this.awaitingStart = false;
            if (this.pendingStartSec > 0) {
                // The seek can take seconds in a long file, which is no stall.
                this.lastPositionAt = Date.now();
                this.seek(this.pendingStartSec);
                this.pendingStartSec = 0;
            }
        }
        if (position !== undefined) {
            if (!this.awaitingStart) {
                this.lastPositionAt = Date.now();
                this.listener?.onPosition(Number(position));
            }
        } else if (/^EOF code: 1\b/.test(line)) {
            // Code 1 is the end of the file. The codes for a file that was replaced or stopped by us are 2 and 4.
            this.playing = false;
            this.stopPolling();
            this.listener?.onEnded();
        } else if (line.startsWith("Failed to open ") || line.includes("av_open_input_stream() failed")) {
            this.fail(line, false);
        }
    }

    /** mplayer stopped: the next file starts it again. */
    private onExit(child: ChildProcess) {
        if (this.process !== child) {
            return;
        }
        AppLogger.warn(undefined, { message: "mplayer stopped" });
        const wasPlaying = this.playing;
        this.process = undefined;
        this.starting = undefined;
        this.playing = false;
        this.paused = false;
        this.stopPolling();
        if (wasPlaying) {
            this.listener?.onError("mplayer stopped");
        }
    }
}
