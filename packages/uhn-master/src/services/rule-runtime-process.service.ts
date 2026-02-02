//services/rule-runtime-process.service.ts

import { AsyncCmdKey, FireAndForgetCmdKey, isRuleRuntimeEventObject, isRuleRuntimeResponseObject, RuleRuntimeActionMessage, RuleRuntimeCommand, RuleRuntimeCommandMap, RuleRuntimeErrorResponse, RuleRuntimeLogMessage, RuleRuntimeResponse } from "@uhn/common";
import { AppErrorV2, AppLogger, fileExists, pathExists, readFile, removeFile, writeFile } from "@uxp/bff-common";
import { assertNever } from "@uxp/common";
import { ChildProcess, spawn, SpawnOptions } from "child_process";
import { EventEmitter } from "events";
import { nanoid } from "nanoid";
import path from "path";
import os from "os";
import env, { getEnvVar } from "../env";
import { systemConfigService } from "./system-config.service";

type SandboxLimits = {
    memoryBytes: number;
    maxPids: number;
};

type SandboxConfig = {
    command: string;
    args: string[];
    cwd?: string;
    env?: string[];
    limits: SandboxLimits;
    runAsUser: string;
    network: "none" | "lo" | "debug-attach" | "full";
    debugListen?: string;
};

type RuleRuntimeProcessEventMap = {
    onActionEvent: [response: RuleRuntimeActionMessage];
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
        (resp: Omit<RuleRuntimeResponse, "id" | "kind">) => void
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

        const { cmd, args, opts, ...rest } = await this.getRuleRuntimeLaunchConfig(blueprintFolder);

        this.process = spawn(cmd, args, opts);
        await writePidFile(this.process.pid!);
        if ("sandboxPayload" in rest) {
            this.process.stdin!.write(
                JSON.stringify(rest.sandboxPayload) + "\n"
            );
        }
        this.setupListeners();

        AppLogger.info({ message: `[RuleRuntimeProcessService] Rule runtime process started with PID ${this.process.pid}` });
        await this.readyPromise;
    }

    private async getRuleRuntimeLaunchConfig(blueprintFolder: string) {
        const sandboxCmd = path.join(env.UHN_SANDBOX_PATH ?? "/usr/lib/uhn", "uhn-sandbox-launch");
        const useSandbox = !!sandboxCmd && await fileExists(sandboxCmd);

        const raw = await this.getRawRuleRuntimeLaunchConfig(blueprintFolder, useSandbox);

        if (!useSandbox) {
            return raw;
        }

        return this.wrapWithSandbox(sandboxCmd, raw);
    }

    private wrapWithSandbox(sandboxCmd: string, raw: {
        cmd: string;
        args: string[];
        opts: SpawnOptions;
        mode: "dev" | "prod" | "debug"

    }) {

        const nodePath = getEnvVar("UHN_NODE_PATH", "/opt/node/bin");
        return {
            cmd: sandboxCmd,
            args: ["run", "--config", "-"],
            opts: {
                ...raw.opts,
                stdio: ["pipe", "pipe", "pipe"],
                env: {
                    ...(raw.opts.env ?? {}),// UHN_RUNTIME_PATH
                    "UHN_WORKSPACE_PATH": env.UHN_WORKSPACE_PATH ?? "/uhn-workspace",
                    "UHN_SANDBOX_PATH": env.UHN_SANDBOX_PATH ?? "/usr/lib/uhn",
                    "UHN_NODE_PATH": nodePath,
                }

            } satisfies SpawnOptions,
            mode: raw.mode,
            sandboxPayload: {
                command: raw.cmd,
                args: raw.args,
                cwd: "/uhn-runtime/packages/uhn-rule-runtime",
                env: [
                    `PATH=/uhn-node/bin:/usr/bin:/bin`,
                    'HOME=/tmp',
                    `TZ=${env.TZ ?? "UTC"}`
                ],
                limits: {
                    memoryBytes: 512 * 1024 * 1024, // 512 MB
                    maxPids: 254
                },
                runAsUser: os.userInfo().username,
                network: raw.mode === "debug" ? "debug-attach" : "lo",
                debugListen: raw.mode === "debug" ? "0.0.0.0:9250" : undefined
            } satisfies SandboxConfig,
        };
    }

    private async getRawRuleRuntimeLaunchConfig(blueprintFolder: string, useSandbox: boolean): Promise<{
        cmd: string;
        args: string[];
        opts: SpawnOptions;
        mode: "dev" | "prod" | "debug";

    }> {
        const hostUhnRuntimePath = getRuleRuntimePkgRoot();
        const hostUhnRoot = path.resolve(hostUhnRuntimePath, "../..");
        const uhnRuntimePath = useSandbox ? "/uhn-runtime/packages/uhn-rule-runtime" : hostUhnRuntimePath;

        const blueprintFolderInUse = useSandbox ? "/uhn-workspace/blueprint/active" : blueprintFolder;
        const tsEntrypoint = path.join(hostUhnRuntimePath, "src", "rule-runtime.ts");
        const { runtimeMode } = systemConfigService.getConfig();
        const isDev = await fileExists(tsEntrypoint)
        const isDebug = runtimeMode === "debug"

        if (isDebug) {
            return {
                cmd: "pnpm",
                args: [
                    "ts-node-dev",
                    "--project",
                    `${uhnRuntimePath}/tsconfig.json`,
                    "--inspect=127.0.0.1:9250",
                    //"--enable-source-maps", // TODO add ui feature to enable debug with source maps
                    //"--transpile-only",
                    `${uhnRuntimePath}/src/rule-runtime.ts`,
                    blueprintFolderInUse,
                    "master"
                ],
                opts: {
                    cwd: hostUhnRuntimePath,
                    env: {
                        "UHN_RUNTIME_PATH": hostUhnRoot,
                    }
                },
                mode: "debug",

            };

        }
        else if (isDev) {
            return {
                cmd: "pnpm",
                args: [
                    "ts-node-dev",
                    "--project", `${uhnRuntimePath}/tsconfig.json`,
                    "--respawn",
                    `${uhnRuntimePath}/src/rule-runtime.ts`,
                    blueprintFolderInUse,
                    "master"
                ],
                opts: {
                    cwd: hostUhnRuntimePath, env: {
                        "UHN_RUNTIME_PATH": hostUhnRoot,
                    }
                },
                mode: "dev"

            };
        } else {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const pkg = require(path.join(hostUhnRuntimePath, "package.json"));
            return {
                cmd: "node",
                args: [`${uhnRuntimePath}/${pkg.main ?? "dist/rule-runtime.js"}`, blueprintFolderInUse, "master"],
                opts: {
                    cwd: hostUhnRuntimePath, env: {
                        "UHN_RUNTIME_PATH": hostUhnRoot,
                    }
                },
                mode: "prod",

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

                if (isRuleRuntimeEventObject(resp)) {
                    switch (resp.cmd) {
                        case "ready":
                            if (!this.ready) {
                                this.readyResolve?.();
                            }
                            continue;
                        case "log":
                            this.handleLogEvent(resp);
                            continue;
                        case "actions":
                            this.emit("onActionEvent", resp);
                            continue;
                        case "resourceMissing":
                            AppLogger.warn(
                                { message: `[RuleRuntimeProcessService] Resource missing for rule ${resp.ruleId}: ${resp.resourceType} ${resp.resourceId} (${resp.reason})` });
                            continue;
                        default:
                            assertNever(resp);
                    }

                }
                if (isRuleRuntimeResponseObject(resp)) {
                    const { kind: _, id, ...rest } = resp

                    const handler = this.pendingResponses.get(id);
                    if (handler) {
                        handler(rest);
                        this.pendingResponses.delete(id);
                    } else {
                        AppLogger.warn({ message: `[RuleRuntimeProcessService] No handler for response ID ${id}` });
                    }
                }
            }
        });
        this.process.stderr?.setEncoding("utf8");
        this.process.stderr?.on("data", (chunk: string) => {
            AppLogger.error({ message: `[RuleRuntimeProcessService][stderr] ${chunk}` });

        });
        this.process.on("exit", async (code, signal) => {
            AppLogger.info({ message: `[RuleRuntimeProcessService] Rule runtime process exited with code ${code} and signal ${signal}` });
            await this.onExit(false);
            this.emit("exit", code, signal);
        });
    }

    async stopRuleRuntime() {
        if (this.process) {
            this.process.removeAllListeners("exit");
            await killChildProcess(this.process, 5000, "Rule runtime process");
            await this.onExit(true);
        }
    }

    private async onExit(isStop: boolean) {
        for (const [, handler] of this.pendingResponses) {
            handler({ error: isStop ? "Rule runtime process stopped" : "Rule runtime process exited unexpectedly" });
        }
        this.pendingResponses.clear();
        this.ready = false;
        this.readyPromise = null;
        this.readyResolve = null;
        this.process = null;
        await removePidFile();
    }

    sendEvent<K extends FireAndForgetCmdKey>(cmd: RuleRuntimeCommandMap[K]["request"]
    ): RuleRuntimeCommandMap[K]["response"] {
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

        this.process.stdin.write(JSON.stringify({
            kind: "event",
            ...cmd
        } satisfies RuleRuntimeCommand) + "\n");
        return;
    }

    private handleLogEvent({ level, message, component, data }: RuleRuntimeLogMessage) {
        switch (level) {
            case "warn":
                AppLogger.warn({ message: `[rule-runtime] [${component}] ${message}`, object: { data } });
                break;
            case "error":
                AppLogger.error({ message: `[rule-runtime] [${component}] ${message}`, object: { data } });
                break;
            case "info":
                AppLogger.info({ message: `[rule-runtime] [${component}] ${message}`, object: { data } });
                break;
            default:
                AppLogger.debug({ message: `[rule-runtime] [${component}] ${message}`, object: { data } });
                break;
        }

    }

    async runCommand<K extends AsyncCmdKey>(cmd: RuleRuntimeCommandMap[K]["request"], timeoutMs = 10000)
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
        const fullCmd = { ...cmd, id, kind: "request" } satisfies RuleRuntimeCommand;

        const promise = new Promise<RuleRuntimeCommandMap[K]["response"]>((resolve, reject) => {
            const timer = timeoutMs > 0 ? setTimeout(() => {
                AppLogger.warn({ message: `[RuleRuntimeProcessService] Rule runtime command ${cmd.cmd} timed out after ${timeoutMs}ms` });
                this.pendingResponses.delete(id);
                reject("Rule runtime command timed out");
            }, timeoutMs) : null;
            this.pendingResponses.set(id, (resp: Omit<RuleRuntimeResponse, "id" | "kind">) => {
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

    canSendCommands(): boolean {
        return this.ready && this.process !== null && this.process.stdin?.writable === true;
    }
}
export const ruleRuntimeProcessService = new RuleRuntimeProcessService();
export type { RuleRuntimeProcessService };
