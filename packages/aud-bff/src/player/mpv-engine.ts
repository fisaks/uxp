import { AppLogger } from "@uxp/bff-common";
import { ChildProcess, spawn } from "child_process";
import { rmSync } from "fs";
import net from "net";
import os from "os";
import path from "path";
import { PlayOptions, PlayerEngine, PlayerEngineListener } from "./player-engine";

const SOCKET_PATH = path.join(os.tmpdir(), "aud-mpv.sock");
const CONNECT_ATTEMPTS = 25;
const CONNECT_RETRY_MS = 200;
const TIME_POS_OBSERVER_ID = 1;

export type MpvConfig = {
    /** The mpv program, "mpv" by default. */
    command: string;
    /** The audio output of mpv, for example "alsa/plughw:0,0" for the analog jack of a Raspberry Pi. mpv chooses when not set. */
    audioDevice?: string;
};

/**
 * Plays with mpv, which is started on the first file and kept running between files. It is controlled over its JSON
 * IPC socket (https://mpv.io/manual/master/#json-ipc): commands go in as lines of JSON, and events, such as the end
 * of a file or a change of the position, come back as lines of JSON.
 */
export class MpvPlayerEngine implements PlayerEngine {
    private listener?: PlayerEngineListener;
    private process?: ChildProcess;
    private socket?: net.Socket;
    private starting?: Promise<void>;
    private received = "";
    /** Where to go when the file that was just loaded is ready: the start of a file that does not start at its beginning. */
    private pendingStartSec = 0;

    constructor(private readonly config: MpvConfig) {}

    setListener(listener: PlayerEngineListener) {
        this.listener = listener;
    }

    async play(file: string, { startSec }: PlayOptions) {
        await this.ensureRunning();
        this.pendingStartSec = startSec;
        this.send(["loadfile", file, "replace"]);
        this.send(["set_property", "pause", false]);
    }

    pause() {
        this.send(["set_property", "pause", true]);
    }

    resume() {
        this.send(["set_property", "pause", false]);
    }

    stop() {
        this.send(["stop"]);
    }

    seek(positionSec: number) {
        this.send(["seek", positionSec, "absolute"]);
    }

    private send(command: unknown[]) {
        this.socket?.write(`${JSON.stringify({ command })}\n`);
    }

    private ensureRunning(): Promise<void> {
        this.starting ??= this.start().catch((error) => {
            this.starting = undefined;
            throw error;
        });
        return this.starting;
    }

    private async start() {
        rmSync(SOCKET_PATH, { force: true });
        const args = [
            "--idle=yes",
            "--no-video",
            "--no-terminal",
            "--really-quiet",
            "--audio-display=no",
            `--input-ipc-server=${SOCKET_PATH}`,
            ...(this.config.audioDevice ? [`--audio-device=${this.config.audioDevice}`] : []),
        ];
        const child = spawn(this.config.command, args, { stdio: "ignore" });
        this.process = child;
        const exited = new Promise<never>((_resolve, reject) => {
            child.once("error", (error: NodeJS.ErrnoException) =>
                reject(
                    new Error(error.code === "ENOENT" ? `${this.config.command} is not installed (or set AUD_PLAYER=fake)` : error.message)
                )
            );
        });
        child.once("exit", () => this.reset(child));
        // mpv does not stop by itself when the server does, so a restart of the server would leave it running.
        process.once("exit", () => child.kill());
        this.socket = await Promise.race([this.connect(), exited]);
        this.socket.on("data", (data) => this.receive(data.toString()));
        this.socket.on("close", () => this.reset(child));
        this.send(["observe_property", TIME_POS_OBSERVER_ID, "time-pos"]);
    }

    private async connect(): Promise<net.Socket> {
        for (let attempt = 1; ; attempt++) {
            try {
                return await new Promise<net.Socket>((resolve, reject) => {
                    const socket = net.createConnection(SOCKET_PATH);
                    socket.once("connect", () => resolve(socket));
                    socket.once("error", reject);
                });
            } catch (error) {
                if (attempt >= CONNECT_ATTEMPTS) {
                    throw error;
                }
                await new Promise((resolve) => setTimeout(resolve, CONNECT_RETRY_MS));
            }
        }
    }

    /** mpv stopped or the socket closed: the next file starts it again. */
    private reset(child: ChildProcess) {
        if (this.process !== child) {
            return;
        }
        AppLogger.warn(undefined, { message: "mpv stopped" });
        this.socket?.destroy();
        this.socket = undefined;
        this.process = undefined;
        this.starting = undefined;
        child.kill();
    }

    private receive(data: string) {
        this.received += data;
        const lines = this.received.split("\n");
        this.received = lines.pop() ?? "";
        for (const line of lines) {
            try {
                this.handle(JSON.parse(line));
            } catch {
                // A line that is not JSON is not an event we know.
            }
        }
    }

    private handle(message: { event?: string; name?: string; data?: unknown; reason?: string; file_error?: string }) {
        if (message.event === "property-change" && message.name === "time-pos" && typeof message.data === "number") {
            this.listener?.onPosition(message.data);
        } else if (message.event === "file-loaded" && this.pendingStartSec > 0) {
            this.seek(this.pendingStartSec);
            this.pendingStartSec = 0;
        } else if (message.event === "end-file") {
            // "stop" is a file that was stopped or replaced by us.
            if (message.reason === "eof") this.listener?.onEnded();
            if (message.reason === "error") this.listener?.onError(message.file_error ?? "mpv could not play the file");
        }
    }
}
