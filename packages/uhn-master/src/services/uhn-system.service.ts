// system-commands.service.ts
import { UhnLogLevel, UhnRuntimeMode, UhnSystemCommand } from "@uhn/common";
import { assertNever } from "@uxp/common";
import { BlueprintRepository } from "../repositories/blueprint.repository";
import { SystemCommandExecutor } from "../system/system-command.executor";
import { SystemCommandRunner } from "../system/system-command.runner";
import { BlueprintCompileUtil } from "../util/blueprint-compiler.util";
import { BlueprintFileUtil } from "../util/blueprint-file.util";
import { blueprintRuntimeSupervisorService } from "./blueprint-runtime-supervisor.service";
import { systemConfigService } from "./system-config.service";

export type SetRunModeContext = {
    requestedAt: number;
    runtimeMode: UhnRuntimeMode;
    currentRuntimeMode?: UhnRuntimeMode;
    requiresRestart?: boolean;
};

export class SystemCommandsService {

    private executor: SystemCommandExecutor;

    constructor() {
        this.executor = new SystemCommandExecutor();
    }

    runCommand(msg: UhnSystemCommand) {

        switch (msg.command) {
            case "setRunMode":
                this.commandSetRunMode(msg.payload.runtimeMode);
                break;
            case "setLogLevel":
                this.commandSetLogLevel(msg.payload.logLevel);
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
    private async commandSetRunMode(runtimeMode: UhnRuntimeMode) {
        await this.executor.executeCommand<SetRunModeContext>("setRunMode",
            { runtimeMode, requestedAt: Date.now() },
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
                        run: ctx => this.recompileBlueprint(ctx.currentRuntimeMode === "debug"),
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
        ctx.requiresRestart = ctx.currentRuntimeMode !== ctx.runtimeMode;
    }

    private async persistMode(ctx: SetRunModeContext) {
        if (ctx.requiresRestart) {
            await systemConfigService.setRuntimeMode(ctx.runtimeMode);
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
    }


}
