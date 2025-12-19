//services/worker.service.ts
import type { ErrorResponse, WorkerCommandMap, WorkerResponse } from "@uhn/common";
import { AppErrorV2, AppLogger, fileExists, pathExists, readFile, removeFile, writeFile } from "@uxp/bff-common";
import { ChildProcess, spawn, SpawnOptions } from "child_process";
import { EventEmitter } from "events";
import { nanoid } from "nanoid";
import path from "path";
import env from "../env";


const PID_FILE = `${env.UHN_WORKSPACE_PATH}/worker.pid`;

// Utility: get package root of @uhn/worker
function getWorkerPkgRoot() {
    const pkgJsonPath = require.resolve("@uhn/worker/package.json");
    return path.dirname(pkgJsonPath);
}

async function writePidFile(pid: number) {
    await writeFile(PID_FILE, pid.toString());
}

async function removePidFile() {
    await removeFile(PID_FILE);
}

async function waitForKill(pid: number) {
    for (let i = 0; i < 10; i++) {
        try {
            process.kill(pid, 0);
            await new Promise(r => setTimeout(r, 100));
        } catch {
            break; // dead
        }
    }
}

async function killOldWorker() {
    if (await pathExists(PID_FILE)) {
        const pid = parseInt(await readFile(PID_FILE, "utf8"));
        if (!isProcessAlive(pid)) {
            await removePidFile();
            return;
        }
        try {
            process.kill(pid, "SIGTERM");
        } catch {
            // Already dead, ignore
        }
        await waitForKill(pid);
        if (!isProcessAlive(pid)) {
            await removePidFile();
            return;
        }
        try {
            process.kill(pid, "SIGKILL");
        } catch {
            // Already dead, ignore
        }
        await waitForKill(pid);
        if (isProcessAlive(pid)) {
            AppLogger.warn({ message: `[WorkerService] Process still alive after SIGKILL PID ${pid} ` });
        } else {
            AppLogger.info({ message: `[WorkerService] Killed orphan worker PID ${pid}` });
        }
        await removePidFile();
    }
}

function isProcessAlive(pid?: number): boolean {
    if (!pid) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

function waitForExit(proc: ChildProcess, waitMs: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const onExit = () => {
            cleanup();
            resolve(true);
        };

        const timer = setTimeout(() => {
            cleanup();
            resolve(false);
        }, waitMs);

        const cleanup = () => {
            clearTimeout(timer);
            proc.removeListener("exit", onExit);
        };

        proc.once("exit", onExit);
    });
}

async function killChildProcess(
    proc: ChildProcess | null | undefined,
    timeoutMs = 5000,
    label = "child process"
): Promise<void> {
    if (!proc?.pid) return;

    const pid = proc.pid;

    // Already dead
    if (!isProcessAlive(pid)) return;


    const oneThird = Math.max(1, Math.floor(timeoutMs / 3));
    const twoThird = oneThird * 2;

    try {
        proc.kill("SIGTERM");
    } catch {
        // Permission issues / already gone
        return;
    }

    const exitedAfterTerm = await waitForExit(proc, twoThird);
    if (exitedAfterTerm || !isProcessAlive(pid)) return;

    AppLogger.warn({
        message: `[killChildProcess] ${label} PID ${pid} did not exit after SIGTERM, sending SIGKILL`,
    });

    try {
        proc.kill("SIGKILL");
    } catch {
        return;
    }

    const exitedAfterKill = await waitForExit(proc, oneThird);
    if (!exitedAfterKill && isProcessAlive(pid)) {
        throw new Error(`${label} PID ${pid} did not exit after SIGKILL`);
    }
}


class WorkerService extends EventEmitter {
    private worker: ChildProcess | null = null;
    private buffer = "";
    private pendingResponses = new Map<
        string,
        (resp: Omit<WorkerResponse, "id">) => void
    >();
    private readyPromise: Promise<void> | null = null;
    private readyResolve: (() => void) | null = null;
    private ready = false;

    async startWorker(blueprintFolder: string, readyTimeoutMs = 20000) {
        await this.stopWorker();
        await killOldWorker();
        this.buffer = "";
        this.ready = false;
        this.readyPromise = new Promise<void>((resolve, reject) => {

            const t = setTimeout(async () => {
                if (!this.ready) {
                    this.readyResolve = null;
                    await killChildProcess(this.worker, 5000, "worker process");

                    reject(`Worker process ready timeout PID: ${this.worker?.pid} is most likely stuck`);
                }
            }, readyTimeoutMs);
            this.readyResolve = () => {
                if (this.ready) return;
                this.ready = true;
                clearTimeout(t);
                resolve();
            };
        });

        const { cmd, args, opts, mode } = await this.getWorkerLaunchConfig(blueprintFolder);

        this.worker = spawn(cmd, args, opts);
        await writePidFile(this.worker.pid!);
        this.setupListeners();

        AppLogger.info({ message: `[WorkerService] Worker process started with PID ${this.worker.pid}` });
        await this.readyPromise;
    }

    private async getWorkerLaunchConfig(blueprintFolder: string): Promise<{
        cmd: string;
        args: string[];
        opts: SpawnOptions;
        mode: "dev" | "prod";
    }> {
        const pkgRoot = getWorkerPkgRoot();
        const tsEntrypoint = path.join(pkgRoot, "src", "uhn.worker.ts");
        const isDev = await fileExists(tsEntrypoint);

        if (isDev) {
            return {
                cmd: "pnpm",
                args: [
                    "ts-node-dev",
                    "--project", path.join(pkgRoot, "tsconfig.json"),
                    "--respawn",
                    tsEntrypoint,
                    blueprintFolder
                ],
                opts: { cwd: pkgRoot },
                mode: "dev"
            };
        } else {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const pkg = require(path.join(pkgRoot, "package.json"));
            const jsEntrypoint = path.join(pkgRoot, pkg.main ?? "dist/uhn.worker.js");
            return {
                cmd: "node",
                args: [jsEntrypoint, blueprintFolder],
                opts: {},
                mode: "prod"
            };
        }
    }

    private setupListeners() {
        if (!this.worker) return;
        this.worker.stdout?.setEncoding("utf8");
        this.worker.stdout?.on("data", (chunk: string) => {
            this.buffer += chunk;
            let eol;
            while ((eol = this.buffer.indexOf("\n")) >= 0) {
                const line = this.buffer.slice(0, eol);
                this.buffer = this.buffer.slice(eol + 1);
                const trimmed = line.trimStart();
                if (!trimmed || !trimmed.startsWith("{")) {
                    AppLogger.info({ message: `[WorkerService] ${line}` });
                    continue; // Ignore non-JSON
                }
                let resp: any;
                try {
                    resp = JSON.parse(line);
                } catch (err) {
                    AppLogger.error({ message: `[WorkerService] Failed to parse JSON`, error: err });
                    continue;
                }

                if (resp && resp.cmd === "ready" && !this.ready) {

                    this.readyResolve?.();
                    continue;
                }
                if (resp && typeof resp === "object" && "id" in resp) {
                    const id = resp.id;
                    delete resp.id;
                    const handler = this.pendingResponses.get(id);
                    if (handler) {
                        handler(resp);
                        this.pendingResponses.delete(id);
                    } else {
                        AppLogger.warn({ message: `[WorkerService] No handler for response ID ${id}` });
                    }
                } else {
                    this.emit("message", resp);
                }
            }
        });
        this.worker.stderr?.setEncoding("utf8");
        this.worker.stderr?.on("data", (chunk: string) => {
            AppLogger.error({ message: `[WorkerService][stderr] ${chunk}` });
            this.emit("stderr", chunk);
        });
        this.worker.on("exit", async (code, signal) => {
            AppLogger.info({ message: `[WorkerService] Worker process exited with code ${code} and signal ${signal}` });
            for (const [, handler] of this.pendingResponses) {
                handler({ error: "Worker process exited unexpectedly" });
            }
            this.pendingResponses.clear();
            this.ready = false;
            this.readyPromise = null;
            this.readyResolve = null;
            this.worker = null;
            await removePidFile();

            this.emit("exit", code, signal);
        });
    }

    async stopWorker() {
        if (this.worker) {
            await killChildProcess(this.worker, 5000, "worker process");
            // cleanup is in the "exit" event handler
        }
    }


    async runCommand<K extends keyof WorkerCommandMap>(cmd: WorkerCommandMap[K]["request"], timeoutMs = 10000)
        : Promise<WorkerCommandMap[K]["response"]> {

        if (!this.ready && this.readyPromise) {
            await this.readyPromise;
        }

        if (!this.ready) {
            throw new AppErrorV2({
                statusCode: 503,
                code: "INTERNAL_SERVER_ERROR",
                message: "Worker process is not ready",
            });
        }
        if (!this.worker || !this.worker.stdin?.writable) {
            throw new AppErrorV2({
                statusCode: 500,
                code: "INTERNAL_SERVER_ERROR",
                message: "Worker process is not running",
            });
        }
        const id = nanoid();
        const fullCmd = { ...cmd, id };

        const promise = new Promise<WorkerCommandMap[K]["response"]>((resolve, reject) => {
            const timer = timeoutMs > 0 ? setTimeout(() => {
                AppLogger.warn({ message: `[WorkerService] Worker command ${cmd.cmd} timed out after ${timeoutMs}ms` });
                this.pendingResponses.delete(id);
                reject("Worker command timed out");
            }, timeoutMs) : null;
            this.pendingResponses.set(id, (resp: Omit<WorkerResponse, "id">) => {
                if (timer) clearTimeout(timer);
                if (resp && typeof resp === "object" && "error" in resp) {
                    reject(resp as ErrorResponse);
                    return;
                } else {
                    resolve(resp as WorkerCommandMap[K]["response"]);
                }
            });
        });

        this.worker.stdin.write(JSON.stringify(fullCmd) + "\n");
        return promise;
    }
}
export const workerService = new WorkerService();
export type { WorkerService };
