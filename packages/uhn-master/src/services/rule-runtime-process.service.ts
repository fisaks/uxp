//services/rule-runtime-process.service.ts

import { RuleRuntimeCommandMap, RuleRuntimeErrorResponse, RuleRuntimeResponse } from "@uhn/common";
import { AppErrorV2, AppLogger, fileExists, pathExists, readFile, removeFile, writeFile } from "@uxp/bff-common";
import { ChildProcess, spawn, SpawnOptions } from "child_process";
import { EventEmitter } from "events";
import { nanoid } from "nanoid";
import path from "path";
import env from "../env";

type RuleRuntimeProcessEventMap = {
    message: [response: Omit<RuleRuntimeResponse, "id">];
    stderr: [chunk: string];
    exit: [code: number | null, signal: NodeJS.Signals | null];
};

const PID_FILE = `${env.UHN_WORKSPACE_PATH}/rule-runtime.pid`;

function getRuleRuntimePkgRoot() {
    const pkgJsonPath = require.resolve("@uhn/rule-runtime/package.json");
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

function isProcessAlive(pid?: number): boolean {
    if (!pid) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

async function killOldRuleRuntime() {
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
            AppLogger.warn({ message: `[RuleRuntimeProcessService] Process still alive after SIGKILL PID ${pid} ` });
        } else {
            AppLogger.info({ message: `[RuleRuntimeProcessService] Killed orphan rule runtime PID ${pid}` });
        }
        await removePidFile();
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


class RuleRuntimeProcessService extends EventEmitter<RuleRuntimeProcessEventMap> {
    private process: ChildProcess | null = null;
    private buffer = "";
    private pendingResponses = new Map<
        string,
        (resp: Omit<RuleRuntimeResponse, "id">) => void
    >();
    private readyPromise: Promise<void> | null = null;
    private readyResolve: (() => void) | null = null;
    private ready = false;

    async startRuleRuntime(blueprintFolder: string, readyTimeoutMs = 20000) {
        await this.stopRuleRuntime();
        await killOldRuleRuntime();
        this.buffer = "";
        this.ready = false;
        this.readyPromise = new Promise<void>((resolve, reject) => {

            const t = setTimeout(async () => {
                if (!this.ready) {
                    this.readyResolve = null;
                    await killChildProcess(this.process, 5000, "Rule runtime process");

                    reject(`Rule runtime process ready timeout PID: ${this.process?.pid} is most likely stuck`);
                }
            }, readyTimeoutMs);
            this.readyResolve = () => {
                if (this.ready) return;
                this.ready = true;
                clearTimeout(t);
                resolve();
            };
        });

        const { cmd, args, opts, mode } = await this.getRuleRuntimeLaunchConfig(blueprintFolder);

        this.process = spawn(cmd, args, opts);
        await writePidFile(this.process.pid!);
        this.setupListeners();

        AppLogger.info({ message: `[RuleRuntimeProcessService] Rule runtime process started with PID ${this.process.pid}` });
        await this.readyPromise;
    }

    private async getRuleRuntimeLaunchConfig(blueprintFolder: string): Promise<{
        cmd: string;
        args: string[];
        opts: SpawnOptions;
        mode: "dev" | "prod";
    }> {
        const pkgRoot = getRuleRuntimePkgRoot();
        const tsEntrypoint = path.join(pkgRoot, "src", "rule-runtime.ts");
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
            const jsEntrypoint = path.join(pkgRoot, pkg.main ?? "dist/rule-runtime.js");
            return {
                cmd: "node",
                args: [jsEntrypoint, blueprintFolder],
                opts: {},
                mode: "prod"
            };
        }
    }

    private setupListeners() {
        if (!this.process) return;
        this.process.stdout?.setEncoding("utf8");
        this.process.stdout?.on("data", (chunk: string) => {
            this.buffer += chunk;
            let eol;
            while ((eol = this.buffer.indexOf("\n")) >= 0) {
                const line = this.buffer.slice(0, eol);
                this.buffer = this.buffer.slice(eol + 1);
                const trimmed = line.trimStart();
                if (!trimmed || !trimmed.startsWith("{")) {
                    AppLogger.info({ message: `[RuleRuntimeProcessService] ${line}` });
                    continue; // Ignore non-JSON
                }
                let resp: any;
                try {
                    resp = JSON.parse(line);
                } catch (err) {
                    AppLogger.error({ message: `[RuleRuntimeProcessService] Failed to parse JSON`, error: err });
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
                        AppLogger.warn({ message: `[RuleRuntimeProcessService] No handler for response ID ${id}` });
                    }
                } else {
                    this.emit("message", resp);
                }
            }
        });
        this.process.stderr?.setEncoding("utf8");
        this.process.stderr?.on("data", (chunk: string) => {
            AppLogger.error({ message: `[RuleRuntimeProcessService][stderr] ${chunk}` });
            this.emit("stderr", chunk);
        });
        this.process.on("exit", async (code, signal) => {
            AppLogger.info({ message: `[RuleRuntimeProcessService] Rule runtime process exited with code ${code} and signal ${signal}` });
            for (const [, handler] of this.pendingResponses) {
                handler({ error: "Rule runtime process exited unexpectedly" });
            }
            this.pendingResponses.clear();
            this.ready = false;
            this.readyPromise = null;
            this.readyResolve = null;
            this.process = null;
            await removePidFile();

            this.emit("exit", code, signal);
        });
    }

    async stopRuleRuntime() {
        if (this.process) {
            await killChildProcess(this.process, 5000, "Rule runtime process");
            // cleanup is in the "exit" event handler
        }
    }


    async runCommand<K extends keyof RuleRuntimeCommandMap>(cmd: RuleRuntimeCommandMap[K]["request"], timeoutMs = 10000)
        : Promise<RuleRuntimeCommandMap[K]["response"]> {

        if (!this.ready && this.readyPromise) {
            await this.readyPromise;
        }

        if (!this.ready) {
            throw new AppErrorV2({
                statusCode: 503,
                code: "INTERNAL_SERVER_ERROR",
                message: "Rule runtime process is not ready",
            });
        }
        if (!this.process || !this.process.stdin?.writable) {
            throw new AppErrorV2({
                statusCode: 500,
                code: "INTERNAL_SERVER_ERROR",
                message: "Rule runtime process is not running",
            });
        }
        const id = nanoid();
        const fullCmd = { ...cmd, id };

        const promise = new Promise<RuleRuntimeCommandMap[K]["response"]>((resolve, reject) => {
            const timer = timeoutMs > 0 ? setTimeout(() => {
                AppLogger.warn({ message: `[RuleRuntimeProcessService] Rule runtime command ${cmd.cmd} timed out after ${timeoutMs}ms` });
                this.pendingResponses.delete(id);
                reject("Rule runtime command timed out");
            }, timeoutMs) : null;
            this.pendingResponses.set(id, (resp: Omit<RuleRuntimeResponse, "id">) => {
                if (timer) clearTimeout(timer);
                if (resp && typeof resp === "object" && "error" in resp) {
                    reject(resp as RuleRuntimeErrorResponse);
                    return;
                } else {
                    resolve(resp as RuleRuntimeCommandMap[K]["response"]);
                }
            });
        });

        this.process.stdin.write(JSON.stringify(fullCmd) + "\n");
        return promise;
    }
}
export const ruleRuntimeProcessService = new RuleRuntimeProcessService();
export type { RuleRuntimeProcessService };
