import { UhnLogLevel, UhnRuntimeMode, UhnSystemCommand } from "@uhn/common";
import { assertNever } from "@uxp/common";
import { BlueprintRepository } from "../repositories/blueprint.repository";
import { SystemCommandExecutor } from "../system/system-command.executor";
import { SystemCommandRunner } from "../system/system-command.runner";
import { BlueprintCompileUtil } from "../util/blueprint-compiler.util";
import { BlueprintFileUtil } from "../util/blueprint-file.util";
import { blueprintRuntimeSupervisorService } from "./blueprint-runtime-supervisor.service";
import { blueprintService } from "./blueprint.service";
import { edgeIdentityService } from "./edge-identity.service";
import { EdgeSystemCommand, systemCommandEdgeService } from "./system-command-edge.service";
import { systemConfigService } from "./system-config.service";
import { uhnSystemSnapshotService } from "./uhn-system-snapshot.service";

export type SetRunModeContext = {
    requestedAt: number;
    requestedRuntimeMode: UhnRuntimeMode;
    currentRuntimeMode?: UhnRuntimeMode;
    requiresRestart?: boolean;
};

/**
 * Executes system commands (setRunMode, setLogLevel, start/stop/restart runtime,
 * recompileBlueprint) initiated from the UI. Routes each command based on its
 * target: master-only commands run locally via step-based executor with status
 * feedback, edge commands are forwarded as MQTT messages, and "all" does both.
 */
export class SystemCommandsService {

    private executor: SystemCommandExecutor;

    constructor() {
        this.executor = new SystemCommandExecutor();
    }

    runCommand(msg: UhnSystemCommand) {
        const target = this.getTarget(msg);
        const includesMaster = target === "all" || target === "master";
        const edgeTargets = this.resolveEdgeTargets(target);

        if (includesMaster) {
            // Forward to edges first (fire-and-forget MQTT), then run master steps
            if (edgeTargets.length > 0) {
                this.forwardToEdges(msg, edgeTargets);
            }
            this.executeOnMaster(msg);
        } else if (edgeTargets.length > 0) {
            // Edge-only: use executor to provide status feedback
            this.executeOnEdgesOnly(msg, edgeTargets);
        }
    }

    private getTarget(msg: UhnSystemCommand): string {
        if (msg.command === "recompileBlueprint") return "master";
        return msg.target ?? "all";
    }

    private resolveEdgeTargets(target: string): string[] {
        if (target === "master") return [];
        if (target === "all") {
            return edgeIdentityService.getAllEdges()
                .filter(e => e.status === "online")
                .map(e => e.edgeId);
        }
        return [target];
    }

    private forwardToEdges(msg: UhnSystemCommand, edgeTargets: string[]) {
        const edgeCmd = this.toEdgeCommand(msg);
        if (!edgeCmd) return;
        for (const edgeId of edgeTargets) {
            systemCommandEdgeService.publishToEdge(edgeId, edgeCmd);
        }
    }

    private toEdgeCommand(msg: UhnSystemCommand): EdgeSystemCommand | null {
        switch (msg.command) {
            case "setLogLevel":
                return { action: "setLogLevel", payload: { logLevel: msg.payload.logLevel } };
            case "setRunMode":
                return { action: "setRunMode", payload: { runtimeMode: msg.payload.runtimeMode } };
            case "stopRuntime":
            case "startRuntime":
            case "restartRuntime":
                return { action: msg.command };
            case "setDebugPort":
                return { action: "setDebugPort", payload: { debugPort: msg.payload.debugPort } };
            case "recompileBlueprint":
                return null;
            default:
                assertNever(msg);
        }
    }

    private executeOnEdgesOnly(msg: UhnSystemCommand, edgeTargets: string[]) {
        if (msg.command === "recompileBlueprint") return;

        if (msg.command === "setRunMode") {
            this.commandSetRunModeOnEdge(msg, edgeTargets);
            return;
        }

        const command = msg.command;
        const label = edgeTargets.length === 1
            ? `Sending ${command} to ${edgeTargets[0]}`
            : `Sending ${command} to ${edgeTargets.length} edges`;

        void this.executor.executeCommand<void>(command, undefined, label,
            async (_context, commandExecution) => {
                const runner = new SystemCommandRunner();
                await runner.runStep(_context, commandExecution, {
                    key: "forwardToEdges",
                    label,
                    run: () => { this.forwardToEdges(msg, edgeTargets); },
                });
            });
    }

    private async commandSetRunModeOnEdge(
        msg: UhnSystemCommand & { command: "setRunMode" },
        edgeTargets: string[]
    ) {
        const runtimeMode = msg.payload.runtimeMode;
        const isDebug = runtimeMode === "debug";

        const needsSourceMaps = isDebug;
        const masterInNormal = systemConfigService.getConfig().runtimeMode === "normal";
        // Exclude the edges we're about to switch — their snapshot still shows old mode
        const needsCleanup = !isDebug && masterInNormal
            && !this.anyEdgeStillInDebug(edgeTargets);

        const label = edgeTargets.length === 1
            ? `Setting ${runtimeMode} mode on ${edgeTargets[0]}`
            : `Setting ${runtimeMode} mode on ${edgeTargets.length} edges`;

        await this.executor.executeCommand<void>("setRunMode", undefined, label,
            async (context, commandExecution) => {
                const runner = new SystemCommandRunner();

                const hasSourceMaps = await BlueprintFileUtil.isActiveDebugCompiled();
                // Recompile when entering debug without source maps, or when the
                // last debugger disconnects and source maps can be stripped.
                const shouldRecompile = (needsSourceMaps && !hasSourceMaps)
                    || (needsCleanup && hasSourceMaps);

                if (shouldRecompile) {
                    await runner.runStep(context, commandExecution, {
                        key: "recompileBlueprint",
                        label: needsSourceMaps
                            ? "Recompiling blueprint with source maps"
                            : "Recompiling blueprint without source maps",
                        run: _ => this.recompileBlueprint(needsSourceMaps),
                    });

                    await runner.runStep(context, commandExecution, {
                        key: "stopRuntime",
                        label: "Stopping runtime",
                        run: _ => this.stopRuntime(),
                    });

                    await runner.runStep(context, commandExecution, {
                        key: "activateRecompile",
                        label: "Activating recompiled blueprint",
                        run: _ => this.activateRecompile(),
                    });

                    await runner.runStep(context, commandExecution, {
                        key: "startRuntime",
                        label: "Starting runtime",
                        run: _ => this.startRuntime(),
                    });
                }

                await runner.runStep(context, commandExecution, {
                    key: "forwardToEdges",
                    label: `Forwarding setRunMode to edge(s)`,
                    run: () => { this.forwardToEdges(msg, edgeTargets); },
                });
            });
    }

    private anyEdgeStillInDebug(excludeEdgeIds: string[]): boolean {
        const snapshot = uhnSystemSnapshotService.getSnapshot();
        if (!snapshot) return false;
        const exclude = new Set(excludeEdgeIds);
        return Object.entries(snapshot.runtimes).some(([id, cfg]) =>
            id !== "master" && !exclude.has(id) && cfg.runMode === "debug"
        );
    }

    private executeOnMaster(msg: UhnSystemCommand) {
        switch (msg.command) {
            case "setRunMode":
                this.commandSetRunMode(msg.payload.runtimeMode);
                break;
            case "setLogLevel":
                this.commandSetLogLevel(msg.payload.logLevel);
                break;
            case "setDebugPort":
                this.commandSetDebugPort(msg.payload.debugPort);
                break;
            case "stopRuntime":
                this.commandStopRuntime();
                break;
            case "startRuntime":
                this.commandStartRuntime();
                break;
            case "restartRuntime":
                this.commandRestartRuntime();
                break;
            case "recompileBlueprint":
                this.commandRecompileBlueprint();
                break;
            default:
                assertNever(msg);
        }
    }
    private async commandRecompileBlueprint() {
        await this.executor.executeCommand<void>("recompileBlueprint",
            undefined,
            "Recompiling blueprint", async (context, commandExecution) => {
                const runner = new SystemCommandRunner();
                const cfg = systemConfigService.getConfig();
                await runner.runStep(context, commandExecution, {
                    key: "recompileBlueprint",
                    label: "Recompiling blueprint",
                    run: _ => this.recompileBlueprint(cfg.runtimeMode === "debug"),
                });

                await runner.runStep(context, commandExecution, {
                    key: "activateRecompile",
                    label: "Activating recompiled blueprint",
                    run: _ => this.activateRecompile(),
                });

                await runner.runStep(context, commandExecution, {
                    key: "stopRuntime",
                    label: "Stopping runtime",
                    run: _ => this.stopRuntime(),
                });

                await runner.runStep(context, commandExecution, {
                    key: "startRuntime",
                    label: "Starting runtime",
                    run: _ => this.startRuntime(),
                });
            });
    }
    private async commandRestartRuntime() {
        await this.executor.executeCommand<void>("restartRuntime",
            undefined,
            "Restarting runtime", async (context, commandExecution) => {
                const runner = new SystemCommandRunner();

                await runner.runStep(context, commandExecution, {
                    key: "stopRuntime",
                    label: "Stopping runtime",
                    run: _ => this.stopRuntime(),
                });
                await runner.runStep(context, commandExecution, {
                    key: "startRuntime",
                    label: "Starting runtime",
                    run: _ => this.startRuntime(),
                });
            });
    }
    private async commandStartRuntime() {
        await this.executor.executeCommand<void>("startRuntime",
            undefined,
            "Starting runtime", async (context, commandExecution) => {
                const runner = new SystemCommandRunner();

                await runner.runStep(context, commandExecution, {
                    key: "startRuntime",
                    label: "Starting runtime",
                    run: _ => this.startRuntime(),
                });
            });
    }
    private async commandStopRuntime() {
        await this.executor.executeCommand<void>("stopRuntime",
            undefined,
            "Stopping runtime", async (context, commandExecution) => {
                const runner = new SystemCommandRunner();

                await runner.runStep(context, commandExecution, {
                    key: "stopRuntime",
                    label: "Stopping runtime",
                    run: _ => this.stopRuntime(),
                });
            });
    }
    private async commandSetLogLevel(logLevel: UhnLogLevel) {
        await this.executor.executeCommand<UhnLogLevel>("setLogLevel",
            logLevel,
            "Updating log level", async (context, commandExecution) => {
                const runner = new SystemCommandRunner();

                await runner.runStep(context, commandExecution, {
                    key: "setLogLevel",
                    label: "Changing log level",
                    run: async ctx => {
                        await systemConfigService.setLogLevel(ctx);
                    },
                });
            });
    }
    private async commandSetDebugPort(debugPort: number) {
        await this.executor.executeCommand<number>("setDebugPort",
            debugPort,
            "Updating debug port", async (context, commandExecution) => {
                const runner = new SystemCommandRunner();

                await runner.runStep(context, commandExecution, {
                    key: "setDebugPort",
                    label: "Changing debug port",
                    run: async ctx => {
                        await systemConfigService.setDebugPort(ctx);
                    },
                });
            });
    }
    private async commandSetRunMode(runtimeMode: UhnRuntimeMode) {
        await this.executor.executeCommand<SetRunModeContext>("setRunMode",
            { requestedRuntimeMode:runtimeMode, requestedAt: Date.now() },
            "Updating runtime mode", async (context, commandExecution) => {
                const runner = new SystemCommandRunner();

                await runner.runStep(context, commandExecution, {
                    key: "loadConfig",
                    label: "Checking current runtime mode",
                    run: ctx => this.loadCurrentMode(ctx),
                });
                if (context.requiresRestart) {
                    await runner.runStep(context, commandExecution, {
                        key: "saveConfig",
                        label: "Changing current runtime mode",
                        run: ctx => this.persistMode(ctx),
                    });

                    await runner.runStep(context, commandExecution, {
                        key: "recompileBlueprint",
                        label: "Recompiling blueprint",
                        run: ctx => this.recompileBlueprint(ctx.requestedRuntimeMode === "debug"),
                    });

                    await runner.runStep(context, commandExecution, {
                        key: "stopRuntime",
                        label: "Stopping runtime",
                        run: _ => this.stopRuntime(),
                    });
                    await runner.runStep(context, commandExecution, {
                        key: "activateRecompile",
                        label: "Activating recompiled blueprint",
                        run: _ => this.activateRecompile(),
                    });

                    await runner.runStep(context, commandExecution, {
                        key: "startRuntime",
                        label: "Starting runtime",
                        run: _ => this.startRuntime(),
                    });
                }
            });
    }


    private async loadCurrentMode(ctx: SetRunModeContext) {
        const cfg = systemConfigService.getConfig();
        ctx.currentRuntimeMode = cfg.runtimeMode;
        ctx.requiresRestart = ctx.currentRuntimeMode !== ctx.requestedRuntimeMode;
    }

    private async persistMode(ctx: SetRunModeContext) {
        if (ctx.requiresRestart) {
            await systemConfigService.setRuntimeMode(ctx.requestedRuntimeMode);
        }
    }

    private async stopRuntime() {
        await blueprintRuntimeSupervisorService.stop();
    }
    private async startRuntime() {
        await blueprintRuntimeSupervisorService.start();
    }

    private async recompileBlueprint(debugMode: boolean) {
        const currentlyActive = await BlueprintRepository.findActive();
        if (!currentlyActive) {
            throw new Error("No active blueprint to recompile");
        }
        const folder = await BlueprintFileUtil.prepareBlueprintWorkdir();
        await BlueprintFileUtil.extractBlueprintToDir(currentlyActive.zipPath, folder);

        const compile = await BlueprintCompileUtil.compileBlueprint({
            blueprintFolder: BlueprintFileUtil.WorkBlueprintFolder,
            identifier: currentlyActive.identifier,
            debugMode: debugMode
        });
        if (!compile.success) {
            throw new Error("Blueprint recompilation failed: " + compile.errorSummary);
        }
    }
    private async activateRecompile() {
        await BlueprintFileUtil.swapActiveBlueprint();
        await blueprintService.publishActiveBlueprint();
    }


}
